from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.api.deps import require_role
from backend.app.models.models import User
from backend.app.services.safety_service import FoodSafetyService
from backend.app.schemas.sharing import FoodSafetyChecklistCreate, FoodSafetyRecordResponse

router = APIRouter(prefix="/safety", tags=["Food Safety & FSSAI Compliance Gate"])

@router.post("/certify", response_model=FoodSafetyRecordResponse, status_code=status.HTTP_201_CREATED)
def certify_listing(
    data: FoodSafetyChecklistCreate,
    current_user: User = Depends(require_role("RESTAURANT")),
    db: Session = Depends(get_db)
):
    """
    SAFEGUARD 5: Mandatory Human Food-Safety Certification Gate.
    A human staff member must record temperature, packaging, sensory, allergen,
    and FSSAI checklist before a meal portion listing can become claimable by NGOs.
    AI is strictly prohibited from certifying food safety.
    """
    return FoodSafetyService.verify_and_certify_listing(db, current_user, data)
