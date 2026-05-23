from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.unpackaged_food import UnpackagedFood
from app.schemas.unpackaged_food import UnpackagedFoodCreate, UnpackagedFoodResponse

router = APIRouter(prefix="/unpackaged-foods", tags=["Unpackaged Foods"])


@router.get("/", response_model=list[UnpackagedFoodResponse])
def list_unpackaged_foods(db: Session = Depends(get_db)):
    return db.query(UnpackagedFood).all()


@router.get("/{food_id}", response_model=UnpackagedFoodResponse)
def get_unpackaged_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(UnpackagedFood).filter(UnpackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unpackaged food not found")
    return food


@router.post("/", response_model=UnpackagedFoodResponse, status_code=status.HTTP_201_CREATED)
def create_unpackaged_food(payload: UnpackagedFoodCreate, db: Session = Depends(get_db)):
    food = UnpackagedFood(**payload.model_dump())
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


@router.put("/{food_id}", response_model=UnpackagedFoodResponse)
def update_unpackaged_food(food_id: int, payload: UnpackagedFoodCreate, db: Session = Depends(get_db)):
    food = db.query(UnpackagedFood).filter(UnpackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unpackaged food not found")
    for key, value in payload.model_dump().items():
        setattr(food, key, value)
    db.commit()
    db.refresh(food)
    return food


@router.delete("/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unpackaged_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(UnpackagedFood).filter(UnpackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unpackaged food not found")
    db.delete(food)
    db.commit()
