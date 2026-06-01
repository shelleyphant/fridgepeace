from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from models import (
    FoodEvent,
    FoodInventory,
    FoodKeeperCategory,
    FoodKeeperProduct,
    FoodOwnership,
    Household,
    HouseholdMember,
    PackagedFood,
    UnpackagedFood,
    User,
    generate_household_code,
    get_db,
)
from schemas import (
    FoodAddToInventoryRequest,
    FoodAddToInventoryResponse,
    FoodEventCreate,
    FoodEventResponse,
    FoodEventWithMemberResponse,
    FoodInventoryCreate,
    FoodInventoryDetailResponse,
    FoodInventoryResponse,
    FoodKeeperProductResponse,
    FoodOwnershipCreate,
    FoodOwnershipResponse,
    FoodSearchResponse,
    HouseholdCreate,
    HouseholdMemberCreate,
    HouseholdMemberResponse,
    HouseholdResponse,
    InventoryItemWithNames,
    MemberJoinRequest,
    MemberLeaveRequest,
    MemberUserBrief,
    MemberWithUserResponse,
    PackagedFoodCreate,
    PackagedFoodResponse,
    PackagedFoodSearchResponse,
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

@router.post("/member/join/", response_model=HouseholdMemberResponse, status_code=status.HTTP_201_CREATED)
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
    db.commit()
    db.refresh(member)
    return member


@router.post("/member/leave/", status_code=status.HTTP_204_NO_CONTENT)
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
def list_inventory(db: Session = Depends(get_db)):
    return db.query(FoodInventory).all()


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
    old_storage = item.storage_location
    for key, value in payload.model_dump().items():
        setattr(item, key, value)

    if payload.storage_location and payload.storage_location != old_storage:
        event = FoodEvent(
            inventory_item_id=item.id,
            member_id=payload.added_by_member_id,
            event_type="moved",
        )
        db.add(event)

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


@router.get("/food-events/by-inventory/{inventory_item_id}/with-members", response_model=list[FoodEventWithMemberResponse])
def list_events_with_members(inventory_item_id: int, db: Session = Depends(get_db)):
    events = (
        db.query(FoodEvent)
        .options(joinedload(FoodEvent.member))
        .filter(FoodEvent.inventory_item_id == inventory_item_id)
        .order_by(FoodEvent.date_occurred.desc())
        .all()
    )
    return [
        FoodEventWithMemberResponse(
            id=e.id,
            inventory_item_id=e.inventory_item_id,
            member_id=e.member_id,
            event_type=e.event_type,
            date_occurred=e.date_occurred,
            member_display_name=e.member.display_name,
        )
        for e in events
    ]


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


# ─── Food Search ───────────────────────────────────────────
# Unified search across FoodKeeper (fresh food) and PackagedFood
# (barcoded items). Returns both result sets in a single response.
# Search is case-insensitive and matches against food names.

@router.get("/foods/search", response_model=FoodSearchResponse)
def search_foods(
    q: str = Query("", min_length=1, description="Search query"),
    db: Session = Depends(get_db),
):
    if not q.strip():
        return FoodSearchResponse(foodkeeper_results=[], packaged_results=[])

    pattern = f"%{q.strip()}%"

    foodkeeper = (
        db.query(FoodKeeperProduct)
        .filter(FoodKeeperProduct.name.ilike(pattern))
        .order_by(FoodKeeperProduct.id)
        .limit(20)
        .all()
    )
    fk_results = []
    for fk in foodkeeper:
        cat_name = None
        if fk.category_id is not None:
            cat = db.query(FoodKeeperCategory).filter(FoodKeeperCategory.id == fk.category_id).first()
            cat_name = cat.category_name if cat else None
        fk_results.append(FoodKeeperProductResponse(
            id=fk.id,
            category_id=fk.category_id,
            name=fk.name,
            fridge_days_min=fk.fridge_days_min,
            fridge_days_max=fk.fridge_days_max,
            freezer_days_min=fk.freezer_days_min,
            freezer_days_max=fk.freezer_days_max,
            pantry_days_min=fk.pantry_days_min,
            pantry_days_max=fk.pantry_days_max,
            category_name=cat_name,
        ))

    packaged = (
        db.query(PackagedFood)
        .filter(PackagedFood.name.ilike(pattern))
        .order_by(PackagedFood.id)
        .limit(20)
        .all()
    )
    pkg_results = [
        PackagedFoodSearchResponse(
            id=p.id,
            barcode=p.barcode,
            name=p.name,
            brand=p.brand,
            image_url=p.image_url,
            category=p.category,
        )
        for p in packaged
    ]

    return FoodSearchResponse(foodkeeper_results=fk_results, packaged_results=pkg_results)


# ─── Unified Add to Inventory ──────────────────────────────
# One endpoint to add either a FoodKeeper fresh food or a packaged
# food to the household inventory. If the food hasn't been added
# before, it creates the underlying food record automatically.

@router.post("/foods/add-to-inventory", response_model=FoodAddToInventoryResponse, status_code=status.HTTP_201_CREATED)
def add_to_inventory(payload: FoodAddToInventoryRequest, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    member = db.query(HouseholdMember).filter(HouseholdMember.id == payload.added_by_member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household member not found")

    is_new = False

    if payload.source == "foodkeeper":
        fk = db.query(FoodKeeperProduct).filter(FoodKeeperProduct.id == payload.source_id).first()
        if not fk:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FoodKeeper product not found")

        existing_food = db.query(UnpackagedFood).filter(
            UnpackagedFood.foodkeeper_id == str(payload.source_id),
            UnpackagedFood.name == fk.name,
        ).first()

        if existing_food:
            unpackaged_id = existing_food.id
            food_item = existing_food
        else:
            unpackaged = UnpackagedFood(
                foodkeeper_id=str(payload.source_id),
                name=fk.name,
                fridge_days_min=fk.fridge_days_min,
                fridge_days_max=fk.fridge_days_max,
                freezer_days_min=fk.freezer_days_min,
                freezer_days_max=fk.freezer_days_max,
                pantry_days_min=fk.pantry_days_min,
                pantry_days_max=fk.pantry_days_max,
            )
            db.add(unpackaged)
            db.flush()
            unpackaged_id = unpackaged.id
            food_item = unpackaged
            is_new = True

        inventory = FoodInventory(
            household_id=payload.household_id,
            added_by_member_id=payload.added_by_member_id,
            unpackaged_food_id=unpackaged_id,
            storage_location=payload.storage_location,
            quantity=payload.quantity,
            unit=payload.unit,
            expiry_date=payload.expiry_date,
        )

    elif payload.source == "packaged":
        pkg = db.query(PackagedFood).filter(PackagedFood.id == payload.source_id).first()
        if not pkg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Packaged food not found")

        inventory = FoodInventory(
            household_id=payload.household_id,
            added_by_member_id=payload.added_by_member_id,
            packaged_food_id=pkg.id,
            storage_location=payload.storage_location,
            quantity=payload.quantity,
            unit=payload.unit,
            expiry_date=payload.expiry_date,
        )
        food_item = pkg
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid source type")

    db.add(inventory)
    db.flush()

    event = FoodEvent(
        inventory_item_id=inventory.id,
        member_id=payload.added_by_member_id,
        event_type="added",
    )
    db.add(event)

    ownership = FoodOwnership(
        inventory_item_id=inventory.id,
        member_id=payload.added_by_member_id,
    )
    db.add(ownership)

    db.commit()
    db.refresh(inventory)

    return FoodAddToInventoryResponse(
        inventory_item=inventory,
        food_item=food_item,
        is_new=is_new,
    )


# ─── Household Inventory with Names ────────────────────────
# Returns all inventory items for a household, with food names,
# brands, images, and categories resolved in a single query.
# Each item includes a source_type field ("packaged" or "unpackaged").

@router.get("/households/{household_id}/inventory", response_model=list[InventoryItemWithNames])
def list_household_inventory(household_id: str, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")

    items = (
        db.query(FoodInventory)
        .options(
            joinedload(FoodInventory.packaged_food),
            joinedload(FoodInventory.unpackaged_food),
            joinedload(FoodInventory.ownerships).joinedload(FoodOwnership.member),
        )
        .filter(FoodInventory.household_id == household_id)
        .order_by(FoodInventory.date_added.desc())
        .all()
    )

    result = []
    for item in items:
        if item.packaged_food is not None:
            food_name = item.packaged_food.name
            food_image = item.packaged_food.image_url
            food_brand = item.packaged_food.brand
            food_category = item.packaged_food.category
            source_type = "packaged"
        elif item.unpackaged_food is not None:
            food_name = item.unpackaged_food.name
            food_image = None
            food_brand = None
            food_category = item.unpackaged_food.category
            source_type = "unpackaged"
        else:
            food_name = None
            food_image = None
            food_brand = None
            food_category = None
            source_type = None

        owner = item.ownerships[0] if item.ownerships else None
        owner_id_val = owner.member_id if owner else None
        owner_display_name_val = owner.member.display_name if owner else None

        result.append(InventoryItemWithNames(
            id=item.id,
            household_id=item.household_id,
            added_by_member_id=item.added_by_member_id,
            packaged_food_id=item.packaged_food_id,
            unpackaged_food_id=item.unpackaged_food_id,
            storage_location=item.storage_location,
            quantity=item.quantity,
            unit=item.unit,
            expiry_date=item.expiry_date,
            date_added=item.date_added,
            date_updated=item.date_updated,
            food_name=food_name,
            food_image=food_image,
            food_brand=food_brand,
            food_category=food_category,
            source_type=source_type,
            owner_id=owner_id_val,
            owner_display_name=owner_display_name_val,
        ))

    return result

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
