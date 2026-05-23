from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.food_inventory import FoodInventory
from app.models.household import Household
from app.models.household_member import HouseholdMember
from app.schemas.food_inventory import FoodInventoryCreate, FoodInventoryResponse

router = APIRouter(prefix="/food-inventory", tags=["Food Inventory"])


@router.get("/", response_model=list[FoodInventoryResponse])
def list_inventory(db: Session = Depends(get_db)):
    return db.query(FoodInventory).all()


@router.get("/{item_id}", response_model=FoodInventoryResponse)
def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FoodInventory).filter(FoodInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return item


@router.post("/", response_model=FoodInventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(payload: FoodInventoryCreate, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    member = db.query(HouseholdMember).filter(HouseholdMember.id == payload.added_by_member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
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


@router.put("/{item_id}", response_model=FoodInventoryResponse)
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


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FoodInventory).filter(FoodInventory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    db.delete(item)
    db.commit()
