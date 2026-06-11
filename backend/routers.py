from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session, joinedload

from models import (
    FoodEvent,
    FoodInventory,
    FoodOwnership,
    Household,
    HouseholdMember,
    Notification,
    OffProductAu,
    PackagedFood,
    UnpackagedFood,
    User,
    UserNotificationPreference,
    generate_household_code,
    get_db,
    get_off_au_db,
)
from schemas import (
    FoodEventCreate,
    FoodEventResponse,
    FoodInventoryCreate,
    FoodInventoryDetailResponse,
    FoodInventoryResponse,
    FoodOwnershipCreate,
    FoodOwnershipResponse,
    FoodSuggestionItem,
    HouseholdCreate,
    HouseholdMemberCreate,
    HouseholdMemberResponse,
    HouseholdResponse,
    MemberJoinRequest,
    MemberLeaveRequest,
    MemberUserBrief,
    MemberWithUserResponse,
    NotificationPreferenceBatchUpdate,
    NotificationPreferenceCreate,
    NotificationPreferenceResponse,
    NotificationResponse,
    OffProductAuDetail,
    OffProductAuSearchPage,
    OffProductStats,
    PackagedFoodCreate,
    PackagedFoodResponse,
    ShoppingSuggestionResponse,
    SuggestionType,
    UnpackagedFoodCreate,
    UnpackagedFoodResponse,
    UserCreate,
    UserHouseholdBrief,
    UserResponse,
)

router = APIRouter()

# ─── Household CRUD ────────────────────────────────────────
# Household is the top-level grouping entity. Deleting a household
# cascades to all its members, inventory items, events, and ownerships.

@router.get("/households/", response_model=list[HouseholdResponse])
def list_households(db: Session = Depends(get_db)):
    return db.query(Household).all()


@router.get("/households/{household_id}", response_model=HouseholdResponse)
def get_household(household_id: str, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    return household


@router.post("/households/", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
def create_household(payload: HouseholdCreate, db: Session = Depends(get_db)):
    code = generate_household_code()
    while db.query(Household).filter(Household.id == code).first() is not None:
        code = generate_household_code()
    household = Household(id=code, name=payload.name)
    db.add(household)
    db.commit()
    db.refresh(household)
    return household


@router.put("/households/{household_id}", response_model=HouseholdResponse)
def update_household(household_id: str, payload: HouseholdCreate, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    household.name = payload.name
    db.commit()
    db.refresh(household)
    return household


@router.delete("/households/{household_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_household(household_id: str, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    db.delete(household)
    db.commit()


# ─── User CRUD ─────────────────────────────────────────────
# Users are independent entities not tied to a specific household.
# Username is globally unique.

@router.get("/users/", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )
    user = User(username=payload.username, display_name=payload.display_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ─── Household Member CRUD ─────────────────────────────────
# Members join a household via a user account. A member with related
# inventory records or events cannot be deleted (enforced by RESTRICT FK).

@router.get("/household-members/", response_model=list[HouseholdMemberResponse])
def list_household_members(db: Session = Depends(get_db)):
    return db.query(HouseholdMember).all()


@router.get("/household-members/{member_id}", response_model=HouseholdMemberResponse)
def get_household_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(HouseholdMember).filter(HouseholdMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household member not found")
    return member


@router.post("/household-members/", response_model=HouseholdMemberResponse, status_code=status.HTTP_201_CREATED)
def create_household_member(payload: HouseholdMemberCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    member = HouseholdMember(
        user_id=payload.user_id,
        household_id=payload.household_id,
        display_name=payload.display_name,
    )
    db.add(member)
    db.flush()

    # Notify existing members of the household about the new member
    other_members = (
        db.query(HouseholdMember)
        .filter(
            HouseholdMember.household_id == payload.household_id,
            HouseholdMember.id != member.id,
        )
        .all()
    )
    for other in other_members:
        _create_notification(
            db,
            user_id=other.user_id,
            message=f"{display_name} has joined the household",
            notification_type="member_joined",
        )

    db.commit()
    db.refresh(member)
    return member


@router.put("/household-members/{member_id}", response_model=HouseholdMemberResponse)
def update_household_member(member_id: int, payload: HouseholdMemberCreate, db: Session = Depends(get_db)):
    member = db.query(HouseholdMember).filter(HouseholdMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household member not found")
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    member.user_id = payload.user_id
    member.household_id = payload.household_id
    member.display_name = payload.display_name
    db.commit()
    db.refresh(member)
    return member


@router.delete("/household-members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_household_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(HouseholdMember).filter(HouseholdMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household member not found")
    db.delete(member)
    db.commit()


# ─── Member Join/Leave ─────────────────────────────────────
# High-level endpoints for users to join and leave households.

@router.post("/member/join", response_model=HouseholdMemberResponse, status_code=status.HTTP_201_CREATED)
def member_join(payload: MemberJoinRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    display_name = payload.display_name if payload.display_name else user.display_name
    member = HouseholdMember(
        user_id=payload.user_id,
        household_id=payload.household_id,
        display_name=display_name,
    )
    db.add(member)
    db.flush()

    # Notify existing members of the household about the new member
    other_members = (
        db.query(HouseholdMember)
        .filter(
            HouseholdMember.household_id == payload.household_id,
            HouseholdMember.id != member.id,
        )
        .all()
    )
    for other in other_members:
        _create_notification(
            db,
            user_id=other.user_id,
            message=f"{display_name} has joined the household",
            notification_type="member_joined",
        )

    db.commit()
    db.refresh(member)
    return member


@router.post("/member/leave", status_code=status.HTTP_204_NO_CONTENT)
def member_leave(payload: MemberLeaveRequest, db: Session = Depends(get_db)):
    member = db.query(HouseholdMember).filter(
        HouseholdMember.user_id == payload.user_id,
        HouseholdMember.household_id == payload.household_id,
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found",
        )
    db.delete(member)
    db.commit()


@router.get("/member/{user_id}/households", response_model=list[UserHouseholdBrief])
def list_user_households(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    memberships = (
        db.query(HouseholdMember)
        .options(joinedload(HouseholdMember.household))
        .filter(HouseholdMember.user_id == user_id)
        .all()
    )
    return [m.household for m in memberships]


@router.get("/member/{household_id}/members", response_model=list[MemberWithUserResponse])
def list_household_members_with_user(household_id: str, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    members = (
        db.query(HouseholdMember)
        .options(joinedload(HouseholdMember.user))
        .filter(HouseholdMember.household_id == household_id)
        .all()
    )
    return members

# ─── Packaged Food CRUD ────────────────────────────────────
# Packaged foods have a unique barcode constraint. The barcode
# uniqueness is checked both on create and on update (when changed).

@router.get("/packaged-foods/", response_model=list[PackagedFoodResponse])
def list_packaged_foods(db: Session = Depends(get_db)):
    return db.query(PackagedFood).all()


@router.get("/packaged-foods/{food_id}", response_model=PackagedFoodResponse)
def get_packaged_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(PackagedFood).filter(PackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Packaged food not found")
    return food


@router.post("/packaged-foods/", response_model=PackagedFoodResponse, status_code=status.HTTP_201_CREATED)
def create_packaged_food(payload: PackagedFoodCreate, db: Session = Depends(get_db)):
    if payload.barcode:
        existing = db.query(PackagedFood).filter(PackagedFood.barcode == payload.barcode).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Barcode already exists")
    food = PackagedFood(**payload.model_dump())
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


@router.put("/packaged-foods/{food_id}", response_model=PackagedFoodResponse)
def update_packaged_food(food_id: int, payload: PackagedFoodCreate, db: Session = Depends(get_db)):
    food = db.query(PackagedFood).filter(PackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Packaged food not found")
    if payload.barcode and payload.barcode != food.barcode:
        existing = db.query(PackagedFood).filter(PackagedFood.barcode == payload.barcode).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Barcode already exists")
    for key, value in payload.model_dump().items():
        setattr(food, key, value)
    db.commit()
    db.refresh(food)
    return food


@router.delete("/packaged-foods/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_packaged_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(PackagedFood).filter(PackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Packaged food not found")
    db.delete(food)
    db.commit()

# ─── Unpackaged Food CRUD ──────────────────────────────────
# Unpackaged foods are items like vegetables and meat, referenced
# from the FoodKeeper database. They have shelf-life estimates.

@router.get("/unpackaged-foods/", response_model=list[UnpackagedFoodResponse])
def list_unpackaged_foods(db: Session = Depends(get_db)):
    return db.query(UnpackagedFood).all()


@router.get("/unpackaged-foods/{food_id}", response_model=UnpackagedFoodResponse)
def get_unpackaged_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(UnpackagedFood).filter(UnpackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unpackaged food not found")
    return food


@router.post("/unpackaged-foods/", response_model=UnpackagedFoodResponse, status_code=status.HTTP_201_CREATED)
def create_unpackaged_food(payload: UnpackagedFoodCreate, db: Session = Depends(get_db)):
    food = UnpackagedFood(**payload.model_dump())
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


@router.put("/unpackaged-foods/{food_id}", response_model=UnpackagedFoodResponse)
def update_unpackaged_food(food_id: int, payload: UnpackagedFoodCreate, db: Session = Depends(get_db)):
    food = db.query(UnpackagedFood).filter(UnpackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unpackaged food not found")
    for key, value in payload.model_dump().items():
        setattr(food, key, value)
    db.commit()
    db.refresh(food)
    return food


@router.delete("/unpackaged-foods/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unpackaged_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(UnpackagedFood).filter(UnpackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unpackaged food not found")
    db.delete(food)
    db.commit()

# ─── Food Inventory CRUD ───────────────────────────────────
# The core table linking households to food items. Each inventory
# record must reference exactly one food type (packaged or unpackaged)
# enforced by a CHECK constraint and validated at the application level.

@router.get("/food-inventory/", response_model=list[FoodInventoryResponse])
def list_inventory(
    household_id: Optional[str] = Query(None, description="Filter by household ID"),
    db: Session = Depends(get_db),
):
    query = db.query(FoodInventory)
    if household_id:
        query = query.filter(FoodInventory.household_id == household_id)
    return query.all()


@router.get("/food-inventory/{item_id}", response_model=FoodInventoryDetailResponse)
def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = (
        db.query(FoodInventory)
        .options(
            joinedload(FoodInventory.packaged_food),
            joinedload(FoodInventory.unpackaged_food),
        )
        .filter(FoodInventory.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return item


@router.post("/food-inventory/", response_model=FoodInventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(payload: FoodInventoryCreate, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    member = db.query(HouseholdMember).filter(HouseholdMember.id == payload.added_by_member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household member not found")
    if (payload.packaged_food_id is not None and payload.unpackaged_food_id is not None) or \
       (payload.packaged_food_id is None and payload.unpackaged_food_id is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item must be either packaged or unpackaged (exactly one of packaged_food_id or unpackaged_food_id)",
        )
    item = FoodInventory(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/food-inventory/{item_id}", response_model=FoodInventoryResponse)
def update_inventory_item(item_id: int, payload: FoodInventoryCreate, db: Session = Depends(get_db)):
    item = db.query(FoodInventory).filter(FoodInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    if (payload.packaged_food_id is not None and payload.unpackaged_food_id is not None) or \
       (payload.packaged_food_id is None and payload.unpackaged_food_id is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item must be either packaged or unpackaged (exactly one of packaged_food_id or unpackaged_food_id)",
        )
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/food-inventory/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FoodInventory).filter(FoodInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    db.delete(item)
    db.commit()

# ─── Food Events ───────────────────────────────────────────
# Events log actions (added, consumed, expired, moved) on inventory
# items. They are read-only historical records; no update endpoint is provided.
# Filtering by inventory item is supported via a dedicated endpoint.

@router.get("/food-events/", response_model=list[FoodEventResponse])
def list_events(db: Session = Depends(get_db)):
    return db.query(FoodEvent).all()


@router.get("/food-events/{event_id}", response_model=FoodEventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(FoodEvent).filter(FoodEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.get("/food-events/by-inventory/{inventory_item_id}", response_model=list[FoodEventResponse])
def list_events_by_inventory(inventory_item_id: int, db: Session = Depends(get_db)):
    return db.query(FoodEvent).filter(FoodEvent.inventory_item_id == inventory_item_id).all()


@router.post("/food-events/", response_model=FoodEventResponse, status_code=status.HTTP_201_CREATED)
def create_event(payload: FoodEventCreate, db: Session = Depends(get_db)):
    item = db.query(FoodInventory).filter(FoodInventory.id == payload.inventory_item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    member = db.query(HouseholdMember).filter(HouseholdMember.id == payload.member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household member not found")
    event = FoodEvent(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/food-events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(FoodEvent).filter(FoodEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()

# ─── Food Ownerships ──────────────────────────────────────
# Many-to-many relationship between inventory items and members,
# using a composite primary key of (inventory_item_id, member_id).
# Supports filtering by inventory item or by member.

@router.get("/food-ownerships/", response_model=list[FoodOwnershipResponse])
def list_ownerships(db: Session = Depends(get_db)):
    return db.query(FoodOwnership).all()


@router.get("/food-ownerships/by-inventory/{inventory_item_id}", response_model=list[FoodOwnershipResponse])
def list_ownerships_by_inventory(inventory_item_id: int, db: Session = Depends(get_db)):
    return db.query(FoodOwnership).filter(FoodOwnership.inventory_item_id == inventory_item_id).all()


@router.get("/food-ownerships/by-member/{member_id}", response_model=list[FoodOwnershipResponse])
def list_ownerships_by_member(member_id: int, db: Session = Depends(get_db)):
    return db.query(FoodOwnership).filter(FoodOwnership.member_id == member_id).all()


@router.post("/food-ownerships/", response_model=FoodOwnershipResponse, status_code=status.HTTP_201_CREATED)
def create_ownership(payload: FoodOwnershipCreate, db: Session = Depends(get_db)):
    item = db.query(FoodInventory).filter(FoodInventory.id == payload.inventory_item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    member = db.query(HouseholdMember).filter(HouseholdMember.id == payload.member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household member not found")
    existing = db.query(FoodOwnership).filter(
        FoodOwnership.inventory_item_id == payload.inventory_item_id,
        FoodOwnership.member_id == payload.member_id,
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ownership already exists")
    ownership = FoodOwnership(**payload.model_dump())
    db.add(ownership)
    db.flush()

    # Notify the member about the shared food
    food_name = _resolve_food_name(db, item.unpackaged_food_id, item.packaged_food_id) or "Food"
    _create_notification(
        db,
        user_id=member.user_id,
        message=f"{food_name} has been shared with you",
        notification_type="food_shared",
    )

    db.commit()
    db.refresh(ownership)
    return ownership


@router.delete("/food-ownerships/{inventory_item_id}/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ownership(inventory_item_id: int, member_id: int, db: Session = Depends(get_db)):
    ownership = db.query(FoodOwnership).filter(
        FoodOwnership.inventory_item_id == inventory_item_id,
        FoodOwnership.member_id == member_id,
    ).first()
    if not ownership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ownership not found")
    db.delete(ownership)
    db.commit()


# ─── Open Food Facts Product Search (DISABLED) ─────────────
# off_data.db has been removed due to large file size.
# The Australian subset (off_data_au.db) is used instead.
# See /off-products-au/ endpoints below.

# @router.get("/off-products/search", response_model=...)
# ...


# ─── Open Food Facts Australia Subset ─────────────────────
# Full-field endpoints backed by off_data_au.db (~70K products).

@router.get("/off-products-au/search", response_model=OffProductAuSearchPage)
def search_off_products_au(
    q: Optional[str] = Query(None, description="Search term (optional; returns all results when omitted)"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_off_au_db),
):
    base_query = db.query(OffProductAu)
    if q:
        base_query = base_query.filter(
            OffProductAu.product_name.ilike(f"%{q}%")
        )
    total = base_query.count()
    results = (
        base_query
        .order_by(OffProductAu.unique_scans_n.desc().nullslast())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    total_pages = (total + page_size - 1) // page_size
    return OffProductAuSearchPage(
        items=results,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/off-products-au/by-barcode/{code}", response_model=OffProductAuDetail)
def get_off_product_au_by_barcode(code: str, db: Session = Depends(get_off_au_db)):
    product = db.query(OffProductAu).filter(OffProductAu.code == code).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.get("/off-products-au/stats", response_model=OffProductStats)
def get_off_products_au_stats(db: Session = Depends(get_off_au_db)):
    count = db.query(sa_func.count(OffProductAu.id)).scalar() or 0
    last = (
        db.query(OffProductAu.imported_at)
        .order_by(OffProductAu.imported_at.desc())
        .first()
    )
    return OffProductStats(
        total_products=count,
        imported_at=last[0] if last else None,
    )


# ─── Shopping Suggestions ──────────────────────────────────
# Rule-based suggestion engine v2 (three-tier logic):
#   - buy_less:   added >= 3  AND  expired/added >= 30%
#   - buy_same:   added >= 3  AND  consumed/added >= 70%
#   - not_enough_data:  otherwise
#
# The endpoint analyses the household's food history (food_inventory
# joined with food_event) and returns the highest-priority suggestion
# found, along with a full breakdown in `details`.

def _resolve_food_name(
    db: Session,
    unpackaged_id: Optional[int],
    packaged_id: Optional[int],
) -> Optional[str]:
    """Look up the human-readable name for a food item by its ID."""
    if unpackaged_id is not None:
        food = (
            db.query(UnpackagedFood)
            .filter(UnpackagedFood.id == unpackaged_id)
            .first()
        )
        if food:
            return food.name
    elif packaged_id is not None:
        food = (
            db.query(PackagedFood)
            .filter(PackagedFood.id == packaged_id)
            .first()
        )
        if food:
            return food.name
    return None


def _count_events_for_food(
    db: Session,
    household_id: str,
    unpackaged_id: Optional[int],
    packaged_id: Optional[int],
    event_type: str,
) -> int:
    """Count food_event rows of a given type linked to a specific food item."""
    return (
        db.query(sa_func.count(FoodEvent.id))
        .join(FoodInventory, FoodEvent.inventory_item_id == FoodInventory.id)
        .filter(
            FoodInventory.household_id == household_id,
            FoodEvent.event_type == event_type,
            (
                (FoodInventory.unpackaged_food_id == unpackaged_id)
                if unpackaged_id is not None
                else (FoodInventory.packaged_food_id == packaged_id)
            ),
        )
        .scalar()
        or 0
    )


def _build_shopping_suggestion(
    household_id: str, db: Session
) -> ShoppingSuggestionResponse:
    """Analyse food consumption patterns and return a three-tier shopping suggestion.

    Rules (applied per food item, in order):
        1. added_count < 3  →  skip (not enough history for this item)
        2. expired/added >= 0.3  →  "buy_less"
        3. consumed/added >= 0.7  →  "buy_same"
        4. otherwise  →  skip (unclear pattern)

    Returns:
        - The highest-priority suggestion found (buy_less > buy_same).
        - A full ``details`` list with analysis for every food item that
          had enough data to evaluate.
        - A neutral message when no suggestion can be made.
    """
    # Fetch all distinct food-item references in this household
    food_rows = (
        db.query(
            FoodInventory.unpackaged_food_id,
            FoodInventory.packaged_food_id,
        )
        .filter(FoodInventory.household_id == household_id)
        .distinct()
        .all()
    )

    if len(food_rows) < 3:
        return ShoppingSuggestionResponse(
            has_suggestion=False,
            suggestion_type="not_enough_data",
            suggestion_text="Add more food records to see shopping suggestions.",
        )

    details: list[FoodSuggestionItem] = []
    # Candidates for the main suggestion: (priority, suggestion_item)
    # priority: buy_less=1, buy_same=2 (lower number = higher priority)
    best_priority: Optional[int] = None
    best_item: Optional[FoodSuggestionItem] = None

    for unpackaged_id, packaged_id in food_rows:
        food_name = _resolve_food_name(db, unpackaged_id, packaged_id)
        if not food_name:
            continue

        # Count how many times this food was added to inventory
        added_count = (
            db.query(sa_func.count(FoodInventory.id))
            .filter(
                FoodInventory.household_id == household_id,
                (
                    (FoodInventory.unpackaged_food_id == unpackaged_id)
                    if unpackaged_id is not None
                    else (FoodInventory.packaged_food_id == packaged_id)
                ),
            )
            .scalar()
            or 0
        )

        # Skip items with insufficient history
        if added_count < 3:
            continue

        # Count expired and consumed events
        expired_count = _count_events_for_food(
            db, household_id, unpackaged_id, packaged_id, "expired"
        )
        consumed_count = _count_events_for_food(
            db, household_id, unpackaged_id, packaged_id, "consumed"
        )

        # Apply rules (in priority order)
        suggestion_type: SuggestionType
        suggestion_text: str

        if expired_count / added_count >= 0.3:
            suggestion_type = "buy_less"
            suggestion_text = (
                f"You often have {food_name} left over. "
                "Try buying a smaller amount next time."
            )
        elif consumed_count / added_count >= 0.7:
            suggestion_type = "buy_same"
            suggestion_text = (
                f"You always finish {food_name} before it expires. "
                "Keep buying the same amount."
            )
        else:
            # Unclear pattern — skip this item
            continue

        item = FoodSuggestionItem(
            food_name=food_name,
            suggestion_type=suggestion_type,
            suggestion_text=suggestion_text,
            added_count=added_count,
            consumed_count=consumed_count,
            expired_count=expired_count,
        )
        details.append(item)

        # Track the best (highest-priority) item: buy_less > buy_same
        priority = 1 if suggestion_type == "buy_less" else 2
        if best_priority is None or priority < best_priority:
            best_priority = priority
            best_item = item

    if best_item is None:
        return ShoppingSuggestionResponse(
            has_suggestion=False,
            suggestion_type="not_enough_data",
            suggestion_text="Add more food records to see shopping suggestions.",
            details=details,
        )

    return ShoppingSuggestionResponse(
        has_suggestion=True,
        suggestion_type=best_item.suggestion_type,
        suggestion_text=best_item.suggestion_text,
        food_name=best_item.food_name,
        added_count=best_item.added_count,
        consumed_count=best_item.consumed_count,
        expired_count=best_item.expired_count,
        details=details,
    )


@router.get(
    "/households/{household_id}/suggestions",
    response_model=ShoppingSuggestionResponse,
)
def get_shopping_suggestion(household_id: str, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    return _build_shopping_suggestion(household_id, db)


# ─── Notification Preferences ──────────────────────────────
# Per-user notification settings. GET retrieves all preferences;
# PUT replaces them entirely (batch update).

@router.get(
    "/users/{user_id}/notification-preferences",
    response_model=list[NotificationPreferenceResponse],
)
def list_notification_preferences(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return (
        db.query(UserNotificationPreference)
        .filter(UserNotificationPreference.user_id == user_id)
        .all()
    )


@router.put(
    "/users/{user_id}/notification-preferences",
    response_model=list[NotificationPreferenceResponse],
)
def update_notification_preferences(
    user_id: int,
    payload: NotificationPreferenceBatchUpdate,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Delete all existing preferences for this user
    db.query(UserNotificationPreference).filter(
        UserNotificationPreference.user_id == user_id
    ).delete()

    # Insert new preferences
    new_preferences = [
        UserNotificationPreference(
            user_id=user_id,
            notification_type=p.notification_type,
            channel=p.channel,
            enabled=p.enabled,
        )
        for p in payload.preferences
    ]
    for pref in new_preferences:
        db.add(pref)

    db.commit()

    # Return the updated list
    return (
        db.query(UserNotificationPreference)
        .filter(UserNotificationPreference.user_id == user_id)
        .all()
    )


# ─── Notification Helpers ──────────────────────────────────

def _create_notification(
    db: Session,
    user_id: int,
    message: str,
    notification_type: str,
) -> Optional[Notification]:
    """Create a notification for a user if they have the corresponding
    notification type enabled in their preferences.

    If no preference record exists for the given type, the notification
    is created by default (opt-out model).
    """
    pref = (
        db.query(UserNotificationPreference)
        .filter(
            UserNotificationPreference.user_id == user_id,
            UserNotificationPreference.notification_type == notification_type,
            UserNotificationPreference.channel == "in_app",
        )
        .first()
    )
    if pref is not None and not pref.enabled:
        return None

    notification = Notification(
        user_id=user_id,
        message=message,
        notification_type=notification_type,
    )
    db.add(notification)
    db.flush()
    return notification


# ─── Notifications ─────────────────────────────────────────
# Actual notification records created by the backend when relevant
# events occur. Users can retrieve them and mark them as read.

@router.get(
    "/users/{user_id}/notifications",
    response_model=list[NotificationResponse],
)
def list_notifications(
    user_id: int,
    read: Optional[bool] = Query(None, description="Filter by read status"),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    query = db.query(Notification).filter(Notification.user_id == user_id)
    if read is not None:
        query = query.filter(Notification.read == read)
    return query.order_by(Notification.created_at.desc(), Notification.id.desc()).all()


@router.patch(
    "/users/{user_id}/notifications/{notification_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
)
def mark_notification_read(
    user_id: int,
    notification_id: int,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id,
    ).first()
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.read = True
    db.commit()


@router.patch(
    "/users/{user_id}/notifications/read-all",
    status_code=status.HTTP_204_NO_CONTENT,
)
def mark_all_notifications_read(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.read == False,
    ).update({"read": True})
    db.commit()
