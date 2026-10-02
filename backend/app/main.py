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


from starlette.types import ASGIApp, Scope, Receive, Send

class VercelPathCorrectionMiddleware:
    """
    Restores the original request path on Vercel serverless deployments.
    When Vercel uses rewrites like /(.*) -> /api/index.py, the ASGI scope['path']
    can be set to the rewrite destination. This middleware inspects Vercel's
    'x-matched-path' header to restore the true request path for FastAPI routing.
    """
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            for key, val in scope.get("headers", []):
                if key.lower() == b"x-matched-path":
                    try:
                        matched = val.decode("latin-1").split("?")[0]
                        if matched:
                            scope["path"] = matched
                    except Exception:
                        pass
                    break
            else:
                if scope.get("path") in ("/api/index.py", "/api/index", "/api/index.py/"):
                    scope["path"] = "/"
        await self.app(scope, receive, send)


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Multi-Tenant Gym Management SaaS API for fee recovery and contactless QR entrance attendance.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Fix Vercel path rewriting
app.add_middleware(VercelPathCorrectionMiddleware)

# Set up CORS middleware for Web, Mobile and local LAN clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include central API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


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
