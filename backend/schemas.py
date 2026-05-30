from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ─── Household ─────────────────────────────────────────────

class HouseholdCreate(BaseModel):
    name: str

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        stripped = v.strip()
        if not stripped:
            raise ValueError('name must not be empty or whitespace-only')
        if len(stripped) > 255:
            raise ValueError('name must not exceed 255 characters')
        return stripped


class HouseholdResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str


# ─── User ──────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    display_name: str

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        stripped = v.strip()
        if not stripped:
            raise ValueError('username must not be empty or whitespace-only')
        if len(stripped) > 255:
            raise ValueError('username must not exceed 255 characters')
        return stripped

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v):
        stripped = v.strip()
        if not stripped:
            raise ValueError('display_name must not be empty or whitespace-only')
        if len(stripped) > 255:
            raise ValueError('display_name must not exceed 255 characters')
        return stripped


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    display_name: str
    created_at: datetime


# ─── Household Member ──────────────────────────────────────

class HouseholdMemberCreate(BaseModel):
    user_id: int
    household_id: str
    display_name: str

    @field_validator('display_name')
    @classmethod
    def validate_display_name(cls, v):
        stripped = v.strip()
        if not stripped:
            raise ValueError('display_name must not be empty or whitespace-only')
        if len(stripped) > 255:
            raise ValueError('display_name must not exceed 255 characters')
        return stripped


class HouseholdMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    household_id: str
    display_name: str
    joined_at: datetime


class MemberJoinRequest(BaseModel):
    user_id: int
    household_id: str
    display_name: Optional[str] = None


class MemberLeaveRequest(BaseModel):
    user_id: int
    household_id: str


class UserHouseholdBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str


class MemberUserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    display_name: str


class MemberWithUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    household_id: str
    display_name: str
    joined_at: datetime
    user: MemberUserBrief


# ─── Packaged Food ─────────────────────────────────────────

class PackagedFoodCreate(BaseModel):
    barcode: Optional[str] = None
    name: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    nutrition: Optional[str] = None


class PackagedFoodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    barcode: Optional[str] = None
    name: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    nutrition: Optional[str] = None


# ─── Unpackaged Food ────────────────────────────────────────

class UnpackagedFoodCreate(BaseModel):
    foodkeeper_id: Optional[str] = None
    category: Optional[str] = None
    name: str
    fridge_days_min: Optional[int] = None
    fridge_days_max: Optional[int] = None
    freezer_days_min: Optional[int] = None
    freezer_days_max: Optional[int] = None
    pantry_days_min: Optional[int] = None
    pantry_days_max: Optional[int] = None

    @field_validator(
        'fridge_days_min', 'fridge_days_max',
        'freezer_days_min', 'freezer_days_max',
        'pantry_days_min', 'pantry_days_max',
        mode='before',
    )
    @classmethod
    def empty_int_str_to_none(cls, v):
        if v == '':
            return None
        return v


class UnpackagedFoodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    foodkeeper_id: Optional[str] = None
    category: Optional[str] = None
    name: str
    fridge_days_min: Optional[int] = None
    fridge_days_max: Optional[int] = None
    freezer_days_min: Optional[int] = None
    freezer_days_max: Optional[int] = None
    pantry_days_min: Optional[int] = None
    pantry_days_max: Optional[int] = None


# ─── Food Inventory ────────────────────────────────────────

class FoodInventoryCreate(BaseModel):
    household_id: str
    added_by_member_id: int
    packaged_food_id: Optional[int] = None
    unpackaged_food_id: Optional[int] = None
    storage_location: Optional[str] = None
    quantity: Decimal = Field(..., gt=0)
    unit: str
    expiry_date: Optional[date] = None

    @field_validator('packaged_food_id', 'unpackaged_food_id', mode='before')
    @classmethod
    def empty_int_str_to_none(cls, v):
        if v == '':
            return None
        return v


class FoodInventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    household_id: str
    added_by_member_id: int
    packaged_food_id: Optional[int] = None
    unpackaged_food_id: Optional[int] = None
    storage_location: Optional[str] = None
    quantity: Decimal
    unit: str
    expiry_date: Optional[date] = None
    date_added: datetime
    date_updated: datetime


class PackagedFoodBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None


class UnpackagedFoodBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    category: Optional[str] = None


class FoodInventoryDetailResponse(FoodInventoryResponse):
    packaged_food: Optional[PackagedFoodBrief] = None
    unpackaged_food: Optional[UnpackagedFoodBrief] = None


# ─── Food Event ────────────────────────────────────────────

class FoodEventCreate(BaseModel):
    inventory_item_id: int
    member_id: int
    event_type: Literal['added', 'consumed', 'expired', 'moved']


class FoodEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    inventory_item_id: int
    member_id: int
    event_type: str
    date_occurred: datetime


# ─── Food Ownership ────────────────────────────────────────

class FoodOwnershipCreate(BaseModel):
    inventory_item_id: int
    member_id: int


class FoodOwnershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    inventory_item_id: int
    member_id: int
    tagged_at: datetime
