from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Initializes database tables on startup (with graceful fallback for serverless).
    """
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Database initialization notice: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-Tenant Gym Management SaaS API for fee recovery and contactless QR entrance attendance.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Set up CORS middleware for Web, Mobile and local LAN clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse

# Include central API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure CORS headers are always returned even when an internal 500 error occurs."""
    import traceback
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error_type": type(exc).__name__,
            "error_msg": str(exc),
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


@app.get("/api/test-db", tags=["Health"])
async def test_db(init: bool = False):
    """Diagnostic endpoint to verify database connectivity and table schema."""
    from sqlalchemy import text
    try:
        async with engine.begin() as conn:
            if init:
                await conn.run_sync(Base.metadata.create_all)
            res = await conn.execute(text("SELECT 1"))
            val = res.scalar()
            
            tables = []
            if settings.DATABASE_URL.startswith("postgresql"):
                t_res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"))
                tables = [r[0] for r in t_res.fetchall()]
        return {
            "status": "connected",
            "select_1": val,
            "database_url_scheme": settings.DATABASE_URL.split("://")[0] if "://" in settings.DATABASE_URL else "unknown",
            "database_host": settings.DATABASE_URL.split("@")[-1].split("/")[0] if "@" in settings.DATABASE_URL else "local",
            "tables": tables,
        }
    except Exception as exc:
        import traceback
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "error_type": type(exc).__name__,
                "error_msg": str(exc),
                "traceback": traceback.format_exc(),
            },
            headers={"Access-Control-Allow-Origin": "*"}
        )


import socket

def get_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


@app.get("/", tags=["Root"])
@app.get("/api", tags=["Root"])
@app.get("/api/index.py", tags=["Root"])
async def root():
    """Root endpoint for Vercel deployment health confirmation."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "lan_ip": get_lan_ip(),
    }
