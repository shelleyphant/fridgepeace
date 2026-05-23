from pydantic import BaseModel, ConfigDict


class PackagedFoodBase(BaseModel):
    barcode: str | None = None
    name: str
    brand: str | None = None
    image_url: str | None = None
    category: str | None = None
    nutrition: str | None = None


class PackagedFoodCreate(PackagedFoodBase):
    pass


class PackagedFoodResponse(PackagedFoodBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
