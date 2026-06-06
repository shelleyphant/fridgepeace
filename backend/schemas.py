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


# ─── Open Food Facts Product (DISABLED) ────────────────────
# off_data.db has been removed due to large file size.
# The Australian subset (off_data_au.db) is used instead.

# class OffProductSearchResult(BaseModel):
#     ...


class OffProductStats(BaseModel):
    total_products: int
    imported_at: Optional[str] = None


# class OffProductSearchPage(BaseModel):
#     ...


# ─── Open Food Facts Australia Subset ──────────────────────

class OffProductAuSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    product_name: str
    generic_name: Optional[str] = None
    brands: Optional[str] = None
    categories: Optional[str] = None
    quantity: Optional[str] = None
    image_url: Optional[str] = None
    image_small_url: Optional[str] = None
    nutriscore_grade: Optional[str] = None
    nova_group: Optional[str] = None
    unique_scans_n: Optional[str] = None
    countries_en: Optional[str] = None


class OffProductAuDetail(OffProductAuSearchResult):
    # Brand & category tags
    brands_tags: Optional[str] = None
    categories_tags: Optional[str] = None
    product_quantity: Optional[str] = None
    serving_size: Optional[str] = None
    stores: Optional[str] = None
    countries_tags: Optional[str] = None
    manufacturing_places: Optional[str] = None
    # Ingredients & allergens
    ingredients_text: Optional[str] = None
    allergens: Optional[str] = None
    allergens_en: Optional[str] = None
    traces: Optional[str] = None
    traces_en: Optional[str] = None
    additives_n: Optional[str] = None
    additives_tags: Optional[str] = None
    # Labels & packaging
    labels_tags: Optional[str] = None
    packaging_tags: Optional[str] = None
    # Scores
    nutriscore_score: Optional[str] = None
    # More images
    image_nutrition_url: Optional[str] = None
    image_ingredients_url: Optional[str] = None
    # Full nutrition per 100g
    energy_kcal_100g: Optional[str] = None
    energy_100g: Optional[str] = None
    energy_from_fat_100g: Optional[str] = None
    fat_100g: Optional[str] = None
    saturated_fat_100g: Optional[str] = None
    trans_fat_100g: Optional[str] = None
    cholesterol_100g: Optional[str] = None
    carbohydrates_100g: Optional[str] = None
    sugars_100g: Optional[str] = None
    fiber_100g: Optional[str] = None
    proteins_100g: Optional[str] = None
    salt_100g: Optional[str] = None
    sodium_100g: Optional[str] = None
    # Vitamins & minerals
    vitamin_a_100g: Optional[str] = None
    vitamin_c_100g: Optional[str] = None
    vitamin_d_100g: Optional[str] = None
    calcium_100g: Optional[str] = None
    iron_100g: Optional[str] = None
    magnesium_100g: Optional[str] = None
    potassium_100g: Optional[str] = None
    zinc_100g: Optional[str] = None
    fruits_vegetables_legumes_100g: Optional[str] = None
    no_nutrition_data: Optional[str] = None
    popularity_tags: Optional[str] = None
    # URLs & metadata
    url: Optional[str] = None
    creator: Optional[str] = None
    created_t: Optional[str] = None
    last_modified_t: Optional[str] = None
    owner: Optional[str] = None
    brand_owner: Optional[str] = None
    data_quality_errors_tags: Optional[str] = None


class OffProductAuSearchPage(BaseModel):
    items: list[OffProductAuSearchResult]
    total: int
    page: int
    page_size: int
    total_pages: int
