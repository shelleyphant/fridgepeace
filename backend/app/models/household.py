from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Household(Base):
    __tablename__ = "household"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    members: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="household", cascade="all, delete-orphan"
    )
    inventory_items: Mapped[list["FoodInventory"]] = relationship(
        "FoodInventory", back_populates="household", cascade="all, delete-orphan"
    )
