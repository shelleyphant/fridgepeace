from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UnpackagedFood(Base):
    __tablename__ = "unpackaged_food"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    foodkeeper_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    fridge_days_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fridge_days_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    freezer_days_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    freezer_days_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pantry_days_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    pantry_days_max: Mapped[int | None] = mapped_column(Integer, nullable=True)

    inventory_items: Mapped[list["FoodInventory"]] = relationship(
        "FoodInventory", back_populates="unpackaged_food"
    )
