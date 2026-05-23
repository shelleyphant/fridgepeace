from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.food_event import FoodEvent
from app.models.food_inventory import FoodInventory
from app.models.household_member import HouseholdMember
from app.schemas.food_event import FoodEventCreate, FoodEventResponse

router = APIRouter(prefix="/food-events", tags=["Food Events"])


@router.get("/", response_model=list[FoodEventResponse])
def list_events(db: Session = Depends(get_db)):
    return db.query(FoodEvent).all()


@router.get("/{event_id}", response_model=FoodEventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(FoodEvent).filter(FoodEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return event


@router.get("/by-inventory/{inventory_item_id}", response_model=list[FoodEventResponse])
def list_events_by_inventory(inventory_item_id: int, db: Session = Depends(get_db)):
    return db.query(FoodEvent).filter(FoodEvent.inventory_item_id == inventory_item_id).all()


@router.post("/", response_model=FoodEventResponse, status_code=status.HTTP_201_CREATED)
def create_event(payload: FoodEventCreate, db: Session = Depends(get_db)):
    inventory = db.query(FoodInventory).filter(FoodInventory.id == payload.inventory_item_id).first()
    if not inventory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    member = db.query(HouseholdMember).filter(HouseholdMember.id == payload.member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    event = FoodEvent(**payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(FoodEvent).filter(FoodEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()
