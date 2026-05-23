from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PackagedFood(Base):
    __tablename__ = "packaged_food"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    barcode: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nutrition: Mapped[str | None] = mapped_column(Text, nullable=True)

    inventory_items: Mapped[list["FoodInventory"]] = relationship(
        "FoodInventory", back_populates="packaged_food"
    )
