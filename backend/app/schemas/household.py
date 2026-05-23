from pydantic import BaseModel, ConfigDict


class HouseholdBase(BaseModel):
    name: str


class HouseholdCreate(HouseholdBase):
    pass


class HouseholdResponse(HouseholdBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
