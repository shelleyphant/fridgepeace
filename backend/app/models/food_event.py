from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FoodEvent(Base):
    __tablename__ = "food_event"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    inventory_item_id: Mapped[int] = mapped_column(
        ForeignKey("food_inventory.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    member_id: Mapped[int] = mapped_column(
        ForeignKey("household_member.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    date_occurred: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    inventory_item: Mapped["FoodInventory"] = relationship(
        "FoodInventory", back_populates="events"
    )
    member: Mapped["HouseholdMember"] = relationship(
        "HouseholdMember", back_populates="events", foreign_keys=[member_id]
    )
