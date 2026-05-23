from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class HouseholdCreate(BaseModel):
    name: str


class HouseholdResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class HouseholdMemberCreate(BaseModel):
    household_id: int
    display_name: str


class HouseholdMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    household_id: int
    display_name: str


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


class FoodInventoryCreate(BaseModel):
    household_id: int
    added_by_member_id: int
    packaged_food_id: Optional[int] = None
    unpackaged_food_id: Optional[int] = None
    storage_location: Optional[str] = None
    quantity: Decimal
    unit: str
    expiry_date: Optional[date] = None


class FoodInventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    household_id: int
    added_by_member_id: int
    packaged_food_id: Optional[int] = None
    unpackaged_food_id: Optional[int] = None
    storage_location: Optional[str] = None
    quantity: Decimal
    unit: str
    expiry_date: Optional[date] = None
    date_added: datetime
    date_updated: datetime


class FoodEventCreate(BaseModel):
    inventory_item_id: int
    member_id: int
    event_type: str


class FoodEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    inventory_item_id: int
    member_id: int
    event_type: str
    date_occurred: datetime


class FoodOwnershipCreate(BaseModel):
    inventory_item_id: int
    member_id: int


class FoodOwnershipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    inventory_item_id: int
    member_id: int
    tagged_at: datetime
