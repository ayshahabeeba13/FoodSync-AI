from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class SurplusListingCreate(BaseModel):
    listing_type: str = Field(..., description="RAW_INGREDIENT or PREPARED_PORTION")
    item_ref_id: str
    item_name: str
    quantity: float = Field(..., gt=0)
    unit: str
    target_audience: str = Field(..., description="RESTAURANT, NGO, ANY")
    available_until: datetime
    transfer_price: Optional[float] = 0.0

class FoodSafetyChecklistCreate(BaseModel):
    listing_id: str
    inspector_name: str = Field(..., min_length=2)
    recorded_temperature_celsius: float
    packaging_intact: bool
    sensory_passed: bool
    allergens_declared: bool
    fssai_compliant: bool
    safety_notes: Optional[str] = None

class FoodSafetyRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: str
    verified_by_staff_id: str
    inspector_name: str
    recorded_temperature_celsius: float
    packaging_intact: bool
    sensory_passed: bool
    allergens_declared: bool
    fssai_compliant: bool
    is_certified_safe: bool
    certified_at: Optional[datetime]

class SurplusListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    restaurant_name: Optional[str] = None
    restaurant_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None
    listing_type: str
    item_ref_id: str
    item_name: str
    quantity: float
    unit: str
    target_audience: str
    status: str
    available_until: datetime
    safety_verified: bool
    safety_record: Optional[FoodSafetyRecordResponse] = None
    created_at: Optional[datetime]

class TransferRequestCreate(BaseModel):
    listing_id: str
    quantity: float = Field(..., gt=0)

class TransferActionRequest(BaseModel):
    handover_code: Optional[str] = None

class TransferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: str
    item_name: Optional[str] = None
    from_restaurant_id: str
    from_restaurant_name: Optional[str] = None
    to_restaurant_id: str
    to_restaurant_name: Optional[str] = None
    quantity: float
    unit: str
    transfer_price: float
    status: str
    handover_code: Optional[str]
    requested_at: Optional[datetime]
    completed_at: Optional[datetime]

class DonationClaimRequest(BaseModel):
    listing_id: str

class DonationVerifyOTPRequest(BaseModel):
    submitted_otp: str = Field(..., min_length=6, max_length=6)

class DonationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    listing_id: str
    dish_name: Optional[str] = None
    restaurant_id: str
    restaurant_name: Optional[str] = None
    restaurant_address: Optional[str] = None
    ngo_id: str
    ngo_name: Optional[str] = None
    quantity: float
    unit: str
    status: str
    otp_expires_at: datetime
    otp_attempt_count: int
    claimed_at: Optional[datetime]
    collected_at: Optional[datetime]
    plain_otp: Optional[str] = None # Only returned to NGO upon claim
