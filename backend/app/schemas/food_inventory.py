from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class FoodInventoryBase(BaseModel):
    household_id: int
    added_by_member_id: int
    packaged_food_id: int | None = None
    unpackaged_food_id: int | None = None
    storage_location: str | None = None
    quantity: Decimal
    unit: str
    expiry_date: date | None = None


class FoodInventoryCreate(FoodInventoryBase):
    pass


class FoodInventoryResponse(FoodInventoryBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date_added: datetime
    date_updated: datetime
