from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FoodEventBase(BaseModel):
    inventory_item_id: int
    member_id: int
    event_type: str


class FoodEventCreate(FoodEventBase):
    pass


class FoodEventResponse(FoodEventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    date_occurred: datetime
