import uuid
from sqlalchemy import Column, String, Text
from app.core.database import Base
from app.models.base import TimestampMixin


class Gym(Base, TimestampMixin):
    """
    Gym tenant model.
    Stores gym details and dynamic white-label branding configurations.
    """
    __tablename__ = "gyms"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    logo_url = Column(Text, nullable=True)
    primary_color = Column(String(20), default="#E11D48", nullable=False)
    qr_secret_token = Column(String(255), nullable=False, unique=True)
