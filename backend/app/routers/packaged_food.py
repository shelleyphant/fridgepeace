from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.packaged_food import PackagedFood
from app.schemas.packaged_food import PackagedFoodCreate, PackagedFoodResponse

router = APIRouter(prefix="/packaged-foods", tags=["Packaged Foods"])


@router.get("/", response_model=list[PackagedFoodResponse])
def list_packaged_foods(db: Session = Depends(get_db)):
    return db.query(PackagedFood).all()


@router.get("/{food_id}", response_model=PackagedFoodResponse)
def get_packaged_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(PackagedFood).filter(PackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Packaged food not found")
    return food


@router.post("/", response_model=PackagedFoodResponse, status_code=status.HTTP_201_CREATED)
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


@router.put("/{food_id}", response_model=PackagedFoodResponse)
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


@router.delete("/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_packaged_food(food_id: int, db: Session = Depends(get_db)):
    food = db.query(PackagedFood).filter(PackagedFood.id == food_id).first()
    if not food:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Packaged food not found")
    db.delete(food)
    db.commit()
