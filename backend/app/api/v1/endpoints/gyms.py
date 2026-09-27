from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_tenant_gym_id
from app.models.gym import Gym
from app.schemas.gym import GymResponse, GymQRTokenResponse

router = APIRouter()


@router.get("/me", response_model=GymResponse)
async def get_current_gym_details(
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns current gym branding details (logo, primary color, display name)
    for dynamic white-label theme customization on Web & Mobile.
    """
    result = await db.execute(select(Gym).where(Gym.id == gym_id))
    gym = result.scalar_one_or_none()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym tenant not found.")
    return gym


@router.get("/qr-token", response_model=GymQRTokenResponse)
async def get_gym_qr_token(
    gym_id: str = Depends(get_current_tenant_gym_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the entrance QR code token for the gym.
    Used by the owner to print or display the entrance poster.
    """
    result = await db.execute(select(Gym).where(Gym.id == gym_id))
    gym = result.scalar_one_or_none()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym tenant not found.")
    return GymQRTokenResponse(
        gym_id=gym.id,
        gym_name=gym.name,
        qr_secret_token=gym.qr_secret_token,
    )
