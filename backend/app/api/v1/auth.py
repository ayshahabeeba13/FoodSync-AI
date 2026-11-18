from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse, SwitchDemoRoleRequest
from backend.app.services.auth_service import AuthService
from backend.app.api.deps import get_current_user
from backend.app.models.models import User

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user and creates their associated restaurant or NGO profile."""
    return AuthService.register_user(db, data)

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticates a user with email and password, returning a JWT bearer token."""
    return AuthService.login_user(db, data)

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Retrieves the authenticated user profile with organization details."""
    return current_user

@router.post("/switch-role", response_model=TokenResponse)
def switch_demo_role(data: SwitchDemoRoleRequest, db: Session = Depends(get_db)):
    """
    Safeguard 6: Controlled demonstration persona switcher.
    Strictly blocked in production environments.
    """
    return AuthService.switch_demo_role(db, data.target_user_id)
