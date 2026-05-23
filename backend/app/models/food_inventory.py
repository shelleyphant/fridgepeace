from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    DECIMAL,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FoodInventory(Base):
    __tablename__ = "food_inventory"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    household_id: Mapped[int] = mapped_column(
        ForeignKey("household.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    added_by_member_id: Mapped[int] = mapped_column(
        ForeignKey("household_member.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    packaged_food_id: Mapped[int | None] = mapped_column(
        ForeignKey("packaged_food.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    unpackaged_food_id: Mapped[int | None] = mapped_column(
        ForeignKey("unpackaged_food.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    storage_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quantity: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_added: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    date_updated: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    household: Mapped["Household"] = relationship(
        "Household", back_populates="inventory_items"
    )
    added_by_member: Mapped["HouseholdMember"] = relationship(
        "HouseholdMember",
        back_populates="added_items",
        foreign_keys=[added_by_member_id],
    )
    packaged_food: Mapped["PackagedFood | None"] = relationship(
        "PackagedFood", back_populates="inventory_items"
    )
    unpackaged_food: Mapped["UnpackagedFood | None"] = relationship(
        "UnpackagedFood", back_populates="inventory_items"
    )
    events: Mapped[list["FoodEvent"]] = relationship(
        "FoodEvent", back_populates="inventory_item", cascade="all, delete-orphan"
    )
    ownerships: Mapped[list["FoodOwnership"]] = relationship(
        "FoodOwnership", back_populates="inventory_item", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "(packaged_food_id IS NOT NULL AND unpackaged_food_id IS NULL) "
            "OR (packaged_food_id IS NULL AND unpackaged_food_id IS NOT NULL)",
            name="ck_food_inventory_type",
        ),
    )
