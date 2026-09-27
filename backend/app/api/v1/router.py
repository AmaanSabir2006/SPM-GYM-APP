from fastapi import APIRouter
from app.api.v1.endpoints import auth, gyms, members, fees, attendance, expenses

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Onboarding"])
api_router.include_router(gyms.router, prefix="/gyms", tags=["Gym Profiles & Dynamic Branding"])
api_router.include_router(members.router, prefix="/members", tags=["Members Management"])
api_router.include_router(fees.router, prefix="/fees", tags=["Fee Tracking & Ledgers"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["QR Attendance"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Operational Expenses & Profit Analytics"])
