from pydantic import BaseModel, ConfigDict


class UnpackagedFoodBase(BaseModel):
    foodkeeper_id: str | None = None
    category: str | None = None
    name: str
    fridge_days_min: int | None = None
    fridge_days_max: int | None = None
    freezer_days_min: int | None = None
    freezer_days_max: int | None = None
    pantry_days_min: int | None = None
    pantry_days_max: int | None = None


class UnpackagedFoodCreate(UnpackagedFoodBase):
    pass


class UnpackagedFoodResponse(UnpackagedFoodBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
