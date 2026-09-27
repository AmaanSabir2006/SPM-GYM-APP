from typing import Optional
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    gym_id: str
    role: str
    user_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GymRegistrationRequest(BaseModel):
    gym_name: str
    gym_slug: str
    primary_color: Optional[str] = "#E11D48"
    owner_name: str
    owner_email: EmailStr
    owner_password: str
    owner_phone: Optional[str] = None
