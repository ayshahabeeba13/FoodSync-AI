from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import init_db
from backend.app.api.v1 import (
    auth,
    health,
    inventory,
    recipes,
    billing,
    predictions,
    b2b,
    safety,
    donations,
    map as map_router,
    analytics,
    admin
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas on startup
    init_db()
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Smart Restaurant Inventory Management and Food Redistribution Network",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health.router, prefix="/api/v1", tags=["System Health"])
app.include_router(auth.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(recipes.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(b2b.router, prefix="/api/v1")
app.include_router(safety.router, prefix="/api/v1")
app.include_router(donations.router, prefix="/api/v1")
app.include_router(map_router.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "fssai_standards": settings.REGULATORY_STANDARD,
        "demo_mode": settings.DEMO_MODE
    }
