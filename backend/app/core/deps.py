from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    gym_id: Optional[str] = None
    role: Optional[str] = None


async def get_current_token_payload(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    """Decodes JWT and verifies required claims."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        gym_id: str = payload.get("gym_id")
        role: str = payload.get("role")
        if user_id is None or gym_id is None:
            raise credentials_exception
        return TokenPayload(sub=user_id, gym_id=gym_id, role=role)
    except JWTError:
        raise credentials_exception


async def get_current_tenant_gym_id(token_data: TokenPayload = Depends(get_current_token_payload)) -> str:
    """
    Enforces tenant isolation by returning the gym_id scoped to the authenticated user.
    All downstream database queries must filter with this gym_id.
    """
    return token_data.gym_id
