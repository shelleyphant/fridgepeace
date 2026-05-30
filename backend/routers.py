from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from models import (
    FoodEvent,
    FoodInventory,
    FoodOwnership,
    Household,
    HouseholdMember,
    PackagedFood,
    UnpackagedFood,
    User,
<<<<<<< HEAD
<<<<<<< HEAD
    generate_household_code,
=======
>>>>>>> 2650f7e (Add User model with unique username, member join/leave endpoints)
=======
    generate_household_code,
>>>>>>> 6b644a9 (Changed Household PK from auto-increment integer to a shareable 4-character)
    get_db,
)
from schemas import (
    FoodEventCreate,
    FoodEventResponse,
    FoodInventoryCreate,
    FoodInventoryDetailResponse,
    FoodInventoryResponse,
    FoodOwnershipCreate,
    FoodOwnershipResponse,
    HouseholdCreate,
    HouseholdMemberCreate,
    HouseholdMemberResponse,
    HouseholdResponse,
    MemberJoinRequest,
    MemberLeaveRequest,
    MemberUserBrief,
    MemberWithUserResponse,
    PackagedFoodCreate,
    PackagedFoodResponse,
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
<<<<<<< HEAD
<<<<<<< HEAD
def list_household_members_with_user(household_id: str, db: Session = Depends(get_db)):
=======
def list_household_members_with_user(household_id: int, db: Session = Depends(get_db)):
>>>>>>> 2650f7e (Add User model with unique username, member join/leave endpoints)
=======
def list_household_members_with_user(household_id: str, db: Session = Depends(get_db)):
>>>>>>> 6b644a9 (Changed Household PK from auto-increment integer to a shareable 4-character)
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
