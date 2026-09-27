from typing import Optional
from pydantic import BaseModel


class GymBase(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None
    primary_color: str = "#E11D48"


class GymResponse(GymBase):
    id: str

    class Config:
        from_attributes = True


class GymQRTokenResponse(BaseModel):
    gym_id: str
    gym_name: str
    qr_secret_token: str
