from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HouseholdMember(Base):
    __tablename__ = "household_member"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    household_id: Mapped[int] = mapped_column(
        ForeignKey("household.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)

    household: Mapped["Household"] = relationship(
        "Household", back_populates="members"
    )
    added_items: Mapped[list["FoodInventory"]] = relationship(
        "FoodInventory",
        back_populates="added_by_member",
        foreign_keys="FoodInventory.added_by_member_id",
    )
    events: Mapped[list["FoodEvent"]] = relationship(
        "FoodEvent",
        back_populates="member",
        foreign_keys="FoodEvent.member_id",
    )
    owned_items: Mapped[list["FoodOwnership"]] = relationship(
        "FoodOwnership", back_populates="member"
    )
