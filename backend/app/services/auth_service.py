import uuid
import re
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from backend.app.core.config import settings
from backend.app.models.models import User, Restaurant, NGO
from backend.app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse, RestaurantBrief, NGOBrief

class AuthService:
    @staticmethod
    def register_user(db: Session, data: UserRegister) -> TokenResponse:
        # 1. Check duplicate email
        existing_user = db.query(User).filter(User.email == data.email.lower().strip()).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists."
            )

        restaurant_id = None
        ngo_id = None

        # 2. Role-specific organization creation
        if data.role == "RESTAURANT":
            if not data.restaurant_name or not data.fssai_license_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Restaurant name and 14-digit FSSAI license number are mandatory."
                )
            fssai_raw = str(data.fssai_license_number)
            # Statutory format validation: strictly 14 numeric digits (no letters, spaces, or symbols)
            # Note: Format validation only; does not claim live statutory portal verification
            if not re.fullmatch(r"^[0-9]{14}$", fssai_raw):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="FSSAI License must be exactly 14 digits (14 numeric digits without spaces or special characters)."
                )
            fssai_clean = fssai_raw
            
            existing_fssai = db.query(Restaurant).filter(Restaurant.fssai_license_number == fssai_clean).first()
            if existing_fssai:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A restaurant with this FSSAI License Number is already registered."
                )

            restaurant_id = str(uuid.uuid4())
            new_restaurant = Restaurant(
                id=restaurant_id,
                name=data.restaurant_name.strip(),
                cuisine_type=data.cuisine_type or "Multi-Cuisine",
                address=data.restaurant_address or "Bangalore, Karnataka, India",
                latitude=data.latitude or 12.9716,
                longitude=data.longitude or 77.5946,
                fssai_license_number=fssai_clean,
                contact_phone=data.contact_phone or data.phone or "+91 98765 43210",
                is_verified=True
            )
            db.add(new_restaurant)

        elif data.role == "NGO":
            if not data.ngo_name or not data.registration_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="NGO name and official registration number are mandatory."
                )
            reg_clean = data.registration_number.strip()
            existing_ngo = db.query(NGO).filter(NGO.registration_number == reg_clean).first()
            if existing_ngo:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An NGO with this registration number is already registered."
                )

            ngo_id = str(uuid.uuid4())
            new_ngo = NGO(
                id=ngo_id,
                name=data.ngo_name.strip(),
                registration_number=reg_clean,
                address=data.ngo_address or "Bangalore, Karnataka, India",
                latitude=data.latitude or 12.9760,
                longitude=data.longitude or 77.6033,
                service_radius_km=data.service_radius_km or 15.0,
                verification_status="VERIFIED"
            )
            db.add(new_ngo)

        # 3. Create user
        user_id = str(uuid.uuid4())
        hashed_pw = get_password_hash(data.password)
        new_user = User(
            id=user_id,
            email=data.email.lower().strip(),
            password_hash=hashed_pw,
            role=data.role,
            full_name=data.full_name.strip(),
            phone=data.phone,
            restaurant_id=restaurant_id,
            ngo_id=ngo_id,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # 4. Generate JWT
        token = create_access_token({
            "sub": new_user.id,
            "email": new_user.email,
            "role": new_user.role,
            "restaurant_id": new_user.restaurant_id,
            "ngo_id": new_user.ngo_id,
            "name": new_user.full_name
        })

        return AuthService._build_token_response(new_user, token)

    @staticmethod
    def login_user(db: Session, data: UserLogin) -> TokenResponse:
        user = db.query(User).filter(User.email == data.email.lower().strip()).first()
        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email address or password."
            )

        token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "restaurant_id": user.restaurant_id,
            "ngo_id": user.ngo_id,
            "name": user.full_name
        })

        return AuthService._build_token_response(user, token)

    @staticmethod
    def get_user_from_token(db: Session, token: str) -> User:
        payload = decode_access_token(token)
        if not payload or "sub" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication credentials."
            )
        user_id = payload["sub"]
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive."
            )
        return user

    @staticmethod
    def switch_demo_role(db: Session, target_user_id: str) -> TokenResponse:
        # Safeguard 6: Strictly check DEMO_MODE flag
        if not settings.DEMO_MODE or settings.ENVIRONMENT == "production":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="One-click role switching is strictly disabled in production environments."
            )

        user = db.query(User).filter(
            (User.id == target_user_id) | (User.email == target_user_id.lower().strip())
        ).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target demo user not found."
            )

        token = create_access_token({
            "sub": user.id,
            "email": user.email,
            "role": user.role,
            "restaurant_id": user.restaurant_id,
            "ngo_id": user.ngo_id,
            "name": user.full_name
        })

        return AuthService._build_token_response(user, token)

    @staticmethod
    def _build_token_response(user: User, token: str) -> TokenResponse:
        restaurant_brief = None
        if user.restaurant:
            restaurant_brief = RestaurantBrief(
                id=user.restaurant.id,
                name=user.restaurant.name,
                cuisine_type=user.restaurant.cuisine_type,
                fssai_license_number=user.restaurant.fssai_license_number,
                address=user.restaurant.address
            )

        ngo_brief = None
        if user.ngo:
            ngo_brief = NGOBrief(
                id=user.ngo.id,
                name=user.ngo.name,
                registration_number=user.ngo.registration_number,
                address=user.ngo.address,
                verification_status=user.ngo.verification_status
            )

        user_resp = UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            phone=user.phone,
            restaurant_id=user.restaurant_id,
            ngo_id=user.ngo_id,
            restaurant=restaurant_brief,
            ngo=ngo_brief
        )

        return TokenResponse(access_token=token, token_type="bearer", user=user_resp)
