from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.household import Household
from app.models.household_member import HouseholdMember
from app.schemas.household_member import HouseholdMemberCreate, HouseholdMemberResponse

router = APIRouter(prefix="/household-members", tags=["Household Members"])


@router.get("/", response_model=list[HouseholdMemberResponse])
def list_members(db: Session = Depends(get_db)):
    return db.query(HouseholdMember).all()


@router.get("/{member_id}", response_model=HouseholdMemberResponse)
def get_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(HouseholdMember).filter(HouseholdMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return member


@router.post("/", response_model=HouseholdMemberResponse, status_code=status.HTTP_201_CREATED)
def create_member(payload: HouseholdMemberCreate, db: Session = Depends(get_db)):
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    member = HouseholdMember(household_id=payload.household_id, display_name=payload.display_name)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.put("/{member_id}", response_model=HouseholdMemberResponse)
def update_member(member_id: int, payload: HouseholdMemberCreate, db: Session = Depends(get_db)):
    member = db.query(HouseholdMember).filter(HouseholdMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    household = db.query(Household).filter(Household.id == payload.household_id).first()
    if not household:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
    member.household_id = payload.household_id
    member.display_name = payload.display_name
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int, db: Session = Depends(get_db)):
    member = db.query(HouseholdMember).filter(HouseholdMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    db.delete(member)
    db.commit()
