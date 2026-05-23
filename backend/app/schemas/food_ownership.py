from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FoodOwnershipBase(BaseModel):
    inventory_item_id: int
    member_id: int


class FoodOwnershipCreate(FoodOwnershipBase):
    pass


class FoodOwnershipResponse(FoodOwnershipBase):
    model_config = ConfigDict(from_attributes=True)
    tagged_at: datetime
