from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

ImageSlot = Literal["image_1", "image_2"]
FoodType = Literal["packaged", "unpackaged", "uncertain"]


class FoodKeeperMatch(BaseModel):
    id: Optional[int] = None
    name: str
    category: Optional[str] = None
    subtitle: Optional[str] = None
    keywords: Optional[str] = None
    score: float
    fridge_days_min: Optional[int] = None
    freezer_days_min: Optional[int] = None
    pantry_days_min: Optional[int] = None


class StorageGuidance(BaseModel):
    pantry: Optional[str] = None
    refrigerate: Optional[str] = None
    freeze: Optional[str] = None


class FoodKeeperOption(FoodKeeperMatch):
    recommended: bool = False
    storage_guidance: Optional[StorageGuidance] = None


class FoodScanResponse(BaseModel):
    food_name: Optional[str]
    confidence: float
    matched_foodkeeper_item: Optional[FoodKeeperMatch] = None
    storage_guidance: Optional[StorageGuidance] = None
    alternatives: List[FoodKeeperMatch] = Field(default_factory=list)
    foodkeeper_options: List[FoodKeeperOption] = Field(default_factory=list)
    requires_confirmation: bool = True
    is_incomplete: bool = False
    missing_information: List[str] = Field(default_factory=list)
    fallback_actions: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class FoodPhotoScanResponse(BaseModel):
    food_type: FoodType
    confidence: float
    images_used: int = 1
    images_requested_next: int = 0
    needs_second_photo: Optional[bool] = None
    requires_food_type_confirmation: bool = True
    requires_match_confirmation: bool = True
    is_incomplete: bool = False
    missing_information: List[str] = Field(default_factory=list)
    fallback_actions: List[str] = Field(default_factory=list)
    next_step: str
    user_message: str
    food_name: Optional[str] = None
    product_name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    search_terms: List[str] = Field(default_factory=list)
    matched_foodkeeper_item: Optional[FoodKeeperMatch] = None
    storage_guidance: Optional[StorageGuidance] = None
    alternatives: List[FoodKeeperMatch] = Field(default_factory=list)
    foodkeeper_options: List[FoodKeeperOption] = Field(default_factory=list)
    reason: Optional[str] = None
    error: Optional[str] = None


class PackagedFoodScanResponse(BaseModel):
    product_name: Optional[str]
    brand: Optional[str] = None
    category: Optional[str] = None
    search_terms: List[str] = Field(default_factory=list)
    confidence: float
    requires_confirmation: bool = True
    is_incomplete: bool = False
    missing_information: List[str] = Field(default_factory=list)
    fallback_actions: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class ExpiryDateResponse(BaseModel):
    raw_text: Optional[str]
    label_type: Optional[str]
    expiry_date: Optional[str]
    confidence: float
    requires_confirmation: bool = True
    is_incomplete: bool = False
    missing_information: List[str] = Field(default_factory=list)
    fallback_actions: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class CombinedScanResponse(BaseModel):
    food_type: FoodType
    confidence: float
    assigned_food_image: Optional[ImageSlot] = None
    assigned_expiry_image: Optional[ImageSlot] = None
    product_name: Optional[str] = None
    food_name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    search_terms: List[str] = Field(default_factory=list)
    matched_foodkeeper_item: Optional[FoodKeeperMatch] = None
    storage_guidance: Optional[StorageGuidance] = None
    alternatives: List[FoodKeeperMatch] = Field(default_factory=list)
    foodkeeper_options: List[FoodKeeperOption] = Field(default_factory=list)
    raw_expiry_text: Optional[str] = None
    label_type: Optional[str] = None
    expiry_date: Optional[str] = None
    images_received: int = 1
    requires_confirmation: bool = True
    is_incomplete: bool = False
    missing_information: List[str] = Field(default_factory=list)
    fallback_actions: List[str] = Field(default_factory=list)
    next_step: str
    user_message: str
    reason: Optional[str] = None
    error: Optional[str] = None
