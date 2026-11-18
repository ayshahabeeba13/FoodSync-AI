from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal

UserRoleType = Literal["RESTAURANT", "NGO", "ADMIN"]

class UserRegister(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    role: UserRoleType
    phone: Optional[str] = None

    # Restaurant registration fields
    restaurant_name: Optional[str] = None
    cuisine_type: Optional[str] = None
    restaurant_address: Optional[str] = None
    latitude: Optional[float] = 12.9716
    longitude: Optional[float] = 77.5946
    fssai_license_number: Optional[str] = None
    contact_phone: Optional[str] = None

    # NGO registration fields
    ngo_name: Optional[str] = None
    registration_number: Optional[str] = None
    ngo_address: Optional[str] = None
    service_radius_km: Optional[float] = 15.0

class UserLogin(BaseModel):
    email: str = Field(..., pattern=r"^[^@]+@[^@]+\.[^@]+$")
    password: str

class RestaurantBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    cuisine_type: str
    fssai_license_number: str
    address: str

class NGOBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    registration_number: str
    address: str
    verification_status: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    restaurant_id: Optional[str] = None
    ngo_id: Optional[str] = None
    restaurant: Optional[RestaurantBrief] = None
    ngo: Optional[NGOBrief] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class SwitchDemoRoleRequest(BaseModel):
    target_user_id: str
