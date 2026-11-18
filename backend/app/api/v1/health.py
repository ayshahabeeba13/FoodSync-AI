from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.models import User, Restaurant, NGO, IngredientBatch, SurplusListing

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    user_count = db.query(User).count()
    restaurant_count = db.query(Restaurant).count()
    ngo_count = db.query(NGO).count()
    batch_count = db.query(IngredientBatch).count()
    listing_count = db.query(SurplusListing).count()

    return {
        "status": "healthy",
        "system": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "demo_mode": settings.DEMO_MODE,
        "regulatory_standard": settings.REGULATORY_STANDARD,
        "database": "connected",
        "counts": {
            "users": user_count,
            "restaurants": restaurant_count,
            "ngos": ngo_count,
            "ingredient_batches": batch_count,
            "surplus_listings": listing_count
        }
    }
