from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, PrimaryKeyConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FoodOwnership(Base):
    __tablename__ = "food_ownership"

    inventory_item_id: Mapped[int] = mapped_column(
        ForeignKey("food_inventory.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    member_id: Mapped[int] = mapped_column(
        ForeignKey("household_member.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    tagged_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    inventory_item: Mapped["FoodInventory"] = relationship(
        "FoodInventory", back_populates="ownerships"
    )
    member: Mapped["HouseholdMember"] = relationship(
        "HouseholdMember", back_populates="owned_items"
    )

    __table_args__ = (
        PrimaryKeyConstraint("inventory_item_id", "member_id"),
    )
