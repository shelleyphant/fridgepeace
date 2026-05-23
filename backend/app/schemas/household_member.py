from pydantic import BaseModel, ConfigDict


class HouseholdMemberBase(BaseModel):
    household_id: int
    display_name: str


class HouseholdMemberCreate(HouseholdMemberBase):
    pass


class HouseholdMemberResponse(HouseholdMemberBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
