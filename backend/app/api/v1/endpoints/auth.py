import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.gym import Gym
from app.models.user import User
from app.schemas.auth import Token, LoginRequest, GymRegistrationRequest

router = APIRouter()


@router.post("/register-gym", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_gym(request: GymRegistrationRequest, db: AsyncSession = Depends(get_db)):
    """
    Onboard a brand new gym tenant and create the gym owner user account.
    """
    # Check if slug or email exists
    existing_gym = await db.execute(select(Gym).where(Gym.slug == request.gym_slug))
    if existing_gym.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A gym with this slug already exists.")

    existing_user = await db.execute(select(User).where(User.email == request.owner_email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    # Create Gym tenant
    qr_token = f"gym_{request.gym_slug}_{secrets.token_hex(8)}"
    new_gym = Gym(
        name=request.gym_name,
        slug=request.gym_slug,
        primary_color=request.primary_color or "#E11D48",
        qr_secret_token=qr_token,
    )
    db.add(new_gym)
    await db.flush()

    # Create Owner User
    hashed_pwd = get_password_hash(request.owner_password)
    owner_user = User(
        gym_id=new_gym.id,
        email=request.owner_email,
        phone=request.owner_phone,
        hashed_password=hashed_pwd,
        full_name=request.owner_name,
        role="owner",
    )
    db.add(owner_user)
    await db.commit()
    await db.refresh(owner_user)

    token = create_access_token(
        subject=owner_user.id,
        gym_id=new_gym.id,
        role="owner",
    )

    return Token(
        access_token=token,
        token_type="bearer",
        gym_id=new_gym.id,
        role="owner",
        user_name=owner_user.full_name,
    )


@router.post("/login", response_model=Token)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate user and return JWT scoped to their gym_id and role.
    """
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated.")

    token = create_access_token(
        subject=user.id,
        gym_id=user.gym_id,
        role=user.role,
    )

    return Token(
        access_token=token,
        token_type="bearer",
        gym_id=user.gym_id,
        role=user.role,
        user_name=user.full_name,
    )
