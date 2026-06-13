from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from .config import get_settings
from .date_parser import parse_labelled_expiry
from .foodkeeper import get_storage_guidance, search_foodkeeper
from .gemini_service import (
    GeminiError,
    classify_food_photo,
    extract_expiry_text,
    identify_food,
    identify_packaged_food,
    inspect_image_set,
)
from .image_utils import (
    HEIC_IMAGE_TYPES,
    SUPPORTED_IMAGE_TYPES,
    ImageConversionError,
    convert_heic_to_jpeg,
)
from .schemas import (
    CombinedScanResponse,
    ExpiryDateResponse,
    FoodKeeperMatch,
    FoodKeeperOption,
    FoodPhotoScanResponse,
    FoodScanResponse,
    ImageSlot,
    PackagedFoodScanResponse,
)

router = APIRouter(prefix="/ai-scan", tags=["AI scanning"])

VALID_IMAGE_SLOTS = {"image_1", "image_2"}


def _build_foodkeeper_options(
    matches: list[FoodKeeperMatch],
    foodkeeper_json_path: str,
) -> list[FoodKeeperOption]:
    return [
        FoodKeeperOption(
            id=match.id,
            name=match.name,
            category=match.category,
            subtitle=match.subtitle,
            keywords=match.keywords,
            score=match.score,
            recommended=index == 0,
            storage_guidance=get_storage_guidance(match, foodkeeper_json_path),
        )
        for index, match in enumerate(matches)
    ]


def _require_foodkeeper_path(settings) -> str:
    if not settings.foodkeeper_json_path:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="FOODKEEPER_JSON_PATH is not configured",
        )
    return settings.foodkeeper_json_path


def _normalise_slot(value: object, available_slots: set[str]) -> ImageSlot | None:
    if isinstance(value, str) and value in VALID_IMAGE_SLOTS and value in available_slots:
        return value  # type: ignore[return-value]
    return None


def _clean_search_terms(*values: Optional[str], existing: Optional[list[str]] = None) -> list[str]:
    cleaned: list[str] = []
    seen = set()
    for value in (existing or []) + [item for item in values if item]:
        term = str(value).strip()
        if term and term not in seen:
            cleaned.append(term)
            seen.add(term)
    return cleaned


def _combined_uncertain_response(
    *,
    images_received: int,
    confidence: float,
    reason: Optional[str],
    error: str,
) -> CombinedScanResponse:
    return CombinedScanResponse(
        food_type="uncertain",
        confidence=confidence,
        assigned_food_image=None,
        assigned_expiry_image=None,
        images_received=images_received,
        requires_confirmation=True,
        is_incomplete=True,
        missing_information=["food-type"],
        fallback_actions=["upload-another-photo", "manual-food-search", "manual-food-type-selection"],
        next_step="retry-or-manual",
        user_message="We could not confidently tell whether this is packaged or unpackaged. Let the user upload another photo or continue manually.",
        reason=reason,
        error=error,
    )


def _combined_expiry_incomplete_response(
    *,
    confidence: float,
    images_received: int,
    assigned_food_image: ImageSlot,
    assigned_expiry_image: ImageSlot | None,
    product_name: Optional[str],
    brand: Optional[str],
    category: Optional[str],
    search_terms: list[str],
    raw_expiry_text: Optional[str],
    label_type: Optional[str],
    reason: Optional[str],
    error: str,
) -> CombinedScanResponse:
    return CombinedScanResponse(
        food_type="packaged",
        confidence=confidence,
        assigned_food_image=assigned_food_image,
        assigned_expiry_image=assigned_expiry_image,
        product_name=product_name,
        brand=brand,
        category=category,
        search_terms=search_terms,
        raw_expiry_text=raw_expiry_text,
        label_type=label_type,
        images_received=images_received,
        requires_confirmation=True,
        is_incomplete=True,
        missing_information=["expiry-date"],
        fallback_actions=["upload-another-photo", "manual-expiry-entry"],
        next_step="retry-or-manual",
        user_message="We recognised the packaged product, but the expiry date still needs a clearer scan or manual entry.",
        reason=reason,
        error=error,
    )


def _combined_unpackaged_lookup(
    food_name: str,
    *,
    confidence: float,
    images_received: int,
    assigned_food_image: ImageSlot,
    assigned_expiry_image: ImageSlot | None,
    reason: Optional[str],
    foodkeeper_json_path: str,
) -> CombinedScanResponse:
    matches = search_foodkeeper(
        food_name,
        foodkeeper_json_path,
        limit=5,
        prefer_unpackaged_fresh=True,
    )
    best_match = matches[0] if matches else None
    guidance = get_storage_guidance(best_match, foodkeeper_json_path) if best_match else None
    foodkeeper_options = _build_foodkeeper_options(matches, foodkeeper_json_path)

    if not best_match:
        return CombinedScanResponse(
            food_type="unpackaged",
            confidence=confidence,
            assigned_food_image=assigned_food_image,
            assigned_expiry_image=assigned_expiry_image,
            food_name=food_name,
            images_received=images_received,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["food-match"],
            fallback_actions=["upload-another-photo", "manual-food-search"],
            next_step="retry-or-manual",
            user_message="We could not match this unpackaged food confidently. Let the user upload another photo or use manual search.",
            reason=reason,
            error="No FoodKeeper match found",
        )

    return CombinedScanResponse(
        food_type="unpackaged",
        confidence=confidence,
        assigned_food_image=assigned_food_image,
        assigned_expiry_image=assigned_expiry_image,
        food_name=food_name,
        matched_foodkeeper_item=best_match,
        storage_guidance=guidance,
        alternatives=matches[1:],
        foodkeeper_options=foodkeeper_options,
        images_received=images_received,
        requires_confirmation=True,
        is_incomplete=False,
        missing_information=[],
        fallback_actions=[],
        next_step="collect-storage-details",
        user_message="We matched this unpackaged food. Ask for storage method and start date, then let the user review and save.",
        reason=reason,
        error=None,
    )


async def _read_image(file: UploadFile) -> tuple[bytes, str]:
    settings = get_settings()
    content_type = (file.content_type or "").lower()
    if content_type not in SUPPORTED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, WebP, HEIC, and HEIF images are supported",
        )
    image_bytes = await file.read()
    if len(image_bytes) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be 5 MB or smaller",
        )
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded image is empty",
        )
    if content_type in HEIC_IMAGE_TYPES:
        try:
            image_bytes = convert_heic_to_jpeg(image_bytes)
        except ImageConversionError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        return image_bytes, "image/jpeg"
    return image_bytes, content_type


@router.post("/combined", response_model=CombinedScanResponse)
async def scan_combined(
    image_1: UploadFile = File(...),
    image_2: Optional[UploadFile] = File(None),
):
    settings = get_settings()
    foodkeeper_json_path = _require_foodkeeper_path(settings)

    image_payloads: dict[str, tuple[bytes, str]] = {
        "image_1": await _read_image(image_1),
    }
    if image_2 is not None and image_2.filename:
        image_payloads["image_2"] = await _read_image(image_2)

    images = [(slot, payload[0], payload[1]) for slot, payload in image_payloads.items()]
    images_received = len(images)

    try:
        inspection = await inspect_image_set(settings, images)
    except GeminiError as exc:
        return _combined_uncertain_response(
            images_received=images_received,
            confidence=0.0,
            reason=None,
            error=str(exc),
        )

    inspection_confidence = float(inspection.get("confidence") or 0.0)
    available_slots = set(image_payloads)
    food_type = str(inspection.get("food_type") or "").strip().lower()
    assigned_food_image = _normalise_slot(inspection.get("assigned_food_image"), available_slots)
    assigned_expiry_image = _normalise_slot(inspection.get("assigned_expiry_image"), available_slots)
    reason = inspection.get("reason")

    if food_type not in {"packaged", "unpackaged"} or inspection_confidence < 0.7 or assigned_food_image is None:
        return _combined_uncertain_response(
            images_received=images_received,
            confidence=inspection_confidence,
            reason=reason,
            error="Food type could not be classified confidently",
        )

    food_image_bytes, food_mime_type = image_payloads[assigned_food_image]

    if food_type == "packaged":
        try:
            packaged_result = await identify_packaged_food(settings, food_image_bytes, food_mime_type)
        except GeminiError as exc:
            return CombinedScanResponse(
                food_type="packaged",
                confidence=inspection_confidence,
                assigned_food_image=assigned_food_image,
                assigned_expiry_image=assigned_expiry_image,
                images_received=images_received,
                requires_confirmation=True,
                is_incomplete=True,
                missing_information=["product-match", "expiry-date"],
                fallback_actions=["upload-another-photo", "manual-food-search", "manual-expiry-entry"],
                next_step="retry-or-manual",
                user_message="We could tell this is packaged, but the product details still need another photo or manual entry.",
                reason=reason,
                error=str(exc),
            )

        product_name = packaged_result.get("product_name")
        product_confidence = float(packaged_result.get("confidence") or 0.0)
        brand = packaged_result.get("brand")
        category = packaged_result.get("category")
        search_terms = _clean_search_terms(
            product_name,
            brand,
            existing=packaged_result.get("search_terms") or [],
        )

        if not product_name or product_confidence < 0.7:
            return CombinedScanResponse(
                food_type="packaged",
                confidence=min(inspection_confidence, product_confidence or inspection_confidence),
                assigned_food_image=assigned_food_image,
                assigned_expiry_image=assigned_expiry_image,
                product_name=product_name,
                brand=brand,
                category=category,
                search_terms=search_terms,
                images_received=images_received,
                requires_confirmation=True,
                is_incomplete=True,
                missing_information=["product-match", "expiry-date"],
                fallback_actions=["upload-another-photo", "manual-food-search", "manual-expiry-entry"],
                next_step="retry-or-manual",
                user_message="We could tell this is packaged, but the product details are still not confident enough to save.",
                reason=reason,
                error="Packaged product could not be identified confidently",
            )

        if assigned_expiry_image is None:
            return _combined_expiry_incomplete_response(
                confidence=min(inspection_confidence, product_confidence),
                images_received=images_received,
                assigned_food_image=assigned_food_image,
                assigned_expiry_image=None,
                product_name=str(product_name).strip(),
                brand=brand,
                category=category,
                search_terms=search_terms,
                raw_expiry_text=None,
                label_type=None,
                reason=reason,
                error="Expiry date image is still missing",
            )

        expiry_image_bytes, expiry_mime_type = image_payloads[assigned_expiry_image]
        try:
            expiry_result = await extract_expiry_text(settings, expiry_image_bytes, expiry_mime_type)
        except GeminiError as exc:
            return _combined_expiry_incomplete_response(
                confidence=min(inspection_confidence, product_confidence),
                images_received=images_received,
                assigned_food_image=assigned_food_image,
                assigned_expiry_image=assigned_expiry_image,
                product_name=str(product_name).strip(),
                brand=brand,
                category=category,
                search_terms=search_terms,
                raw_expiry_text=None,
                label_type=None,
                reason=reason,
                error=str(exc),
            )

        raw_text = expiry_result.get("raw_text")
        gemini_label_type = expiry_result.get("label_type")
        expiry_confidence = float(expiry_result.get("confidence") or 0.0)
        if not raw_text or expiry_confidence < 0.7:
            return _combined_expiry_incomplete_response(
                confidence=min(inspection_confidence, product_confidence, expiry_confidence or inspection_confidence),
                images_received=images_received,
                assigned_food_image=assigned_food_image,
                assigned_expiry_image=assigned_expiry_image,
                product_name=str(product_name).strip(),
                brand=brand,
                category=category,
                search_terms=search_terms,
                raw_expiry_text=raw_text,
                label_type=gemini_label_type,
                reason=reason,
                error="Expiry date could not be read confidently",
            )

        label_type, parsed_date = parse_labelled_expiry(raw_text)
        final_label_type = label_type or gemini_label_type
        if final_label_type in {"packed-on", "baked-on"}:
            return _combined_expiry_incomplete_response(
                confidence=min(inspection_confidence, product_confidence, expiry_confidence),
                images_received=images_received,
                assigned_food_image=assigned_food_image,
                assigned_expiry_image=assigned_expiry_image,
                product_name=str(product_name).strip(),
                brand=brand,
                category=category,
                search_terms=search_terms,
                raw_expiry_text=raw_text,
                label_type=final_label_type,
                reason=reason,
                error=f"{final_label_type} is informational and should not be treated as an expiry date",
            )
        if parsed_date is None:
            return _combined_expiry_incomplete_response(
                confidence=min(inspection_confidence, product_confidence, expiry_confidence),
                images_received=images_received,
                assigned_food_image=assigned_food_image,
                assigned_expiry_image=assigned_expiry_image,
                product_name=str(product_name).strip(),
                brand=brand,
                category=category,
                search_terms=search_terms,
                raw_expiry_text=raw_text,
                label_type=final_label_type,
                reason=reason,
                error="No valid Australian expiry date was found",
            )

        return CombinedScanResponse(
            food_type="packaged",
            confidence=min(inspection_confidence, product_confidence, expiry_confidence),
            assigned_food_image=assigned_food_image,
            assigned_expiry_image=assigned_expiry_image,
            product_name=str(product_name).strip(),
            brand=brand,
            category=category,
            search_terms=search_terms,
            raw_expiry_text=raw_text,
            label_type=final_label_type,
            expiry_date=parsed_date.isoformat(),
            images_received=images_received,
            requires_confirmation=True,
            is_incomplete=False,
            missing_information=[],
            fallback_actions=[],
            next_step="review-and-save",
            user_message="We recognised the packaged product and read the expiry date. Let the user review the result and save.",
            reason=reason,
            error=None,
        )

    try:
        unpackaged_result = await identify_food(settings, food_image_bytes, food_mime_type)
    except GeminiError as exc:
        return CombinedScanResponse(
            food_type="unpackaged",
            confidence=inspection_confidence,
            assigned_food_image=assigned_food_image,
            assigned_expiry_image=assigned_expiry_image,
            images_received=images_received,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["food-match"],
            fallback_actions=["upload-another-photo", "manual-food-search"],
            next_step="retry-or-manual",
            user_message="We could tell this is unpackaged food, but the food item still needs another photo or manual entry.",
            reason=reason,
            error=str(exc),
        )

    food_name = unpackaged_result.get("food_name")
    unpackaged_confidence = float(unpackaged_result.get("confidence") or 0.0)
    if not food_name or unpackaged_confidence < 0.7:
        return CombinedScanResponse(
            food_type="unpackaged",
            confidence=min(inspection_confidence, unpackaged_confidence or inspection_confidence),
            assigned_food_image=assigned_food_image,
            assigned_expiry_image=assigned_expiry_image,
            food_name=food_name,
            images_received=images_received,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["food-match"],
            fallback_actions=["upload-another-photo", "manual-food-search"],
            next_step="retry-or-manual",
            user_message="We could tell this is unpackaged food, but not which food item it is.",
            reason=reason,
            error="Food item could not be identified confidently",
        )

    return _combined_unpackaged_lookup(
        str(food_name).strip().lower(),
        confidence=min(inspection_confidence, unpackaged_confidence),
        images_received=images_received,
        assigned_food_image=assigned_food_image,
        assigned_expiry_image=assigned_expiry_image,
        reason=reason,
        foodkeeper_json_path=foodkeeper_json_path,
    )


@router.post("/food-photo", response_model=FoodPhotoScanResponse)
async def scan_food_photo(image: UploadFile = File(...)):
    settings = get_settings()
    image_bytes, mime_type = await _read_image(image)

    try:
        result = await classify_food_photo(settings, image_bytes, mime_type)
    except GeminiError as exc:
        return FoodPhotoScanResponse(
            food_type="uncertain",
            confidence=0.0,
            images_used=1,
            images_requested_next=0,
            needs_second_photo=None,
            requires_food_type_confirmation=True,
            requires_match_confirmation=True,
            is_incomplete=True,
            missing_information=["food-type"],
            fallback_actions=["reupload-food-photo", "manual-food-type-selection", "manual-food-search"],
            next_step="confirm-food-type",
            user_message="We could not tell whether this is packaged or unpackaged. Ask the user to choose manually.",
            error=str(exc),
        )

    food_type = str(result.get("food_type") or "").strip().lower()
    confidence = float(result.get("confidence") or 0.0)
    reason = result.get("reason")

    if food_type not in {"packaged", "unpackaged"} or confidence < 0.7:
        return FoodPhotoScanResponse(
            food_type="uncertain",
            confidence=confidence,
            images_used=1,
            images_requested_next=0,
            needs_second_photo=None,
            requires_food_type_confirmation=True,
            requires_match_confirmation=True,
            is_incomplete=True,
            missing_information=["food-type"],
            fallback_actions=["reupload-food-photo", "manual-food-type-selection", "manual-food-search"],
            next_step="confirm-food-type",
            user_message="We are not sure whether this is packaged or unpackaged. Ask the user to choose the correct flow.",
            food_name=result.get("food_name"),
            product_name=result.get("product_name"),
            brand=result.get("brand"),
            category=result.get("category"),
            search_terms=_clean_search_terms(existing=result.get("search_terms") or []),
            reason=reason,
            error="Food type could not be classified confidently",
        )

    if food_type == "packaged":
        product_name = result.get("product_name")
        return FoodPhotoScanResponse(
            food_type="packaged",
            confidence=confidence,
            images_used=1,
            images_requested_next=1,
            needs_second_photo=True,
            requires_food_type_confirmation=False,
            requires_match_confirmation=True,
            is_incomplete=True,
            missing_information=["expiry-date"],
            fallback_actions=["upload-expiry-photo", "manual-expiry-entry", "reupload-food-photo"],
            next_step="scan-expiry-date",
            user_message="This looks like a packaged product. Confirm the product result, then ask the user to scan the printed date label.",
            product_name=str(product_name).strip() if product_name else None,
            brand=result.get("brand"),
            category=result.get("category"),
            search_terms=_clean_search_terms(product_name, result.get("brand"), existing=result.get("search_terms") or []),
            reason=reason,
            error=None if product_name else "Packaged product type was detected, but the product name still needs manual confirmation",
        )

    foodkeeper_json_path = _require_foodkeeper_path(settings)
    food_name = str(result.get("food_name") or "").strip().lower()
    matches = search_foodkeeper(
        food_name,
        foodkeeper_json_path,
        limit=5,
        prefer_unpackaged_fresh=True,
    )
    best_match = matches[0] if matches else None
    guidance = get_storage_guidance(best_match, foodkeeper_json_path) if best_match else None
    foodkeeper_options = _build_foodkeeper_options(matches, foodkeeper_json_path)

    return FoodPhotoScanResponse(
        food_type="unpackaged",
        confidence=confidence,
        images_used=1,
        images_requested_next=0,
        needs_second_photo=False,
        requires_food_type_confirmation=False,
        requires_match_confirmation=True,
        is_incomplete=best_match is None,
        missing_information=[] if best_match else ["food-match"],
        fallback_actions=["manual-food-search", "reupload-food-photo"] if best_match is None else [],
        next_step="confirm-food-match",
        user_message="This looks like unpackaged food. Confirm the food match, then ask for storage method and start date.",
        food_name=food_name or None,
        matched_foodkeeper_item=best_match,
        storage_guidance=guidance,
        alternatives=matches[1:],
        foodkeeper_options=foodkeeper_options,
        reason=reason,
        error=None if best_match else "No FoodKeeper match found",
    )


@router.post("/unpackaged-food", response_model=FoodScanResponse)
async def scan_unpackaged_food(image: UploadFile = File(...)):
    settings = get_settings()
    image_bytes, mime_type = await _read_image(image)
    foodkeeper_json_path = _require_foodkeeper_path(settings)

    try:
        result = await identify_food(settings, image_bytes, mime_type)
    except GeminiError as exc:
        return FoodScanResponse(
            food_name=None,
            confidence=0.0,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["food-match"],
            fallback_actions=["reupload-food-photo", "manual-food-search"],
            error=str(exc),
        )

    food_name = result.get("food_name")
    confidence = float(result.get("confidence") or 0.0)
    if not food_name or confidence < 0.7:
        return FoodScanResponse(
            food_name=food_name,
            confidence=confidence,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["food-match"],
            fallback_actions=["reupload-food-photo", "manual-food-search"],
            error="Food item could not be identified confidently",
        )

    matches = search_foodkeeper(
        str(food_name).strip().lower(),
        foodkeeper_json_path,
        limit=5,
        prefer_unpackaged_fresh=True,
    )
    best_match = matches[0] if matches else None
    guidance = get_storage_guidance(best_match, foodkeeper_json_path) if best_match else None
    foodkeeper_options = _build_foodkeeper_options(matches, foodkeeper_json_path)

    return FoodScanResponse(
        food_name=str(food_name).strip().lower(),
        confidence=confidence,
        matched_foodkeeper_item=best_match,
        storage_guidance=guidance,
        alternatives=matches[1:],
        foodkeeper_options=foodkeeper_options,
        requires_confirmation=True,
        is_incomplete=best_match is None,
        missing_information=[] if best_match else ["food-match"],
        fallback_actions=["manual-food-search", "reupload-food-photo"] if best_match is None else [],
        error=None if best_match else "No FoodKeeper match found",
    )


@router.post("/packaged-food", response_model=PackagedFoodScanResponse)
async def scan_packaged_food(image: UploadFile = File(...)):
    settings = get_settings()
    image_bytes, mime_type = await _read_image(image)

    try:
        result = await identify_packaged_food(settings, image_bytes, mime_type)
    except GeminiError as exc:
        return PackagedFoodScanResponse(
            product_name=None,
            brand=None,
            category=None,
            search_terms=[],
            confidence=0.0,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["product-match", "expiry-date"],
            fallback_actions=["reupload-food-photo", "manual-food-search", "manual-expiry-entry"],
            error=str(exc),
        )

    product_name = result.get("product_name")
    confidence = float(result.get("confidence") or 0.0)
    if not product_name or confidence < 0.7:
        return PackagedFoodScanResponse(
            product_name=product_name,
            brand=result.get("brand"),
            category=result.get("category"),
            search_terms=_clean_search_terms(existing=result.get("search_terms") or []),
            confidence=confidence,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["product-match", "expiry-date"],
            fallback_actions=["reupload-food-photo", "manual-food-search", "manual-expiry-entry"],
            error="Packaged product could not be identified confidently",
        )

    return PackagedFoodScanResponse(
        product_name=str(product_name).strip(),
        brand=result.get("brand"),
        category=result.get("category"),
        search_terms=_clean_search_terms(product_name, result.get("brand"), existing=result.get("search_terms") or []),
        confidence=confidence,
        requires_confirmation=True,
        is_incomplete=True,
        missing_information=["expiry-date"],
        fallback_actions=["upload-expiry-photo", "manual-expiry-entry", "reupload-food-photo"],
        error=None,
    )


@router.post("/expiry-date", response_model=ExpiryDateResponse)
async def scan_expiry_date(image: UploadFile = File(...)):
    settings = get_settings()
    image_bytes, mime_type = await _read_image(image)

    try:
        result = await extract_expiry_text(settings, image_bytes, mime_type)
    except GeminiError as exc:
        return ExpiryDateResponse(
            raw_text=None,
            label_type=None,
            expiry_date=None,
            confidence=0.0,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["expiry-date"],
            fallback_actions=["reupload-expiry-photo", "manual-expiry-entry"],
            error=str(exc),
        )

    raw_text = result.get("raw_text")
    gemini_label_type = result.get("label_type")
    confidence = float(result.get("confidence") or 0.0)
    if not raw_text or confidence < 0.7:
        return ExpiryDateResponse(
            raw_text=raw_text,
            label_type=gemini_label_type,
            expiry_date=None,
            confidence=confidence,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["expiry-date"],
            fallback_actions=["reupload-expiry-photo", "manual-expiry-entry"],
            error="Expiry date could not be read confidently",
        )

    label_type, parsed_date = parse_labelled_expiry(raw_text)
    final_label_type = label_type or gemini_label_type
    if final_label_type in {"packed-on", "baked-on"}:
        return ExpiryDateResponse(
            raw_text=raw_text,
            label_type=final_label_type,
            expiry_date=None,
            confidence=confidence,
            requires_confirmation=True,
            is_incomplete=True,
            missing_information=["expiry-date"],
            fallback_actions=["reupload-expiry-photo", "manual-expiry-entry"],
            error=f"{final_label_type} is informational and should not be treated as an expiry date",
        )

    return ExpiryDateResponse(
        raw_text=raw_text,
        label_type=final_label_type,
        expiry_date=parsed_date.isoformat() if parsed_date else None,
        confidence=confidence,
        requires_confirmation=True,
        is_incomplete=parsed_date is None,
        missing_information=[] if parsed_date else ["expiry-date"],
        fallback_actions=[] if parsed_date else ["reupload-expiry-photo", "manual-expiry-entry"],
        error=None if parsed_date else "No valid Australian expiry date found",
    )
