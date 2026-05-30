from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    DECIMAL,
    ForeignKey,
    PrimaryKeyConstraint,
    String,
    Text,
    create_engine,
    func,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)

SQLALCHEMY_DATABASE_URL = "sqlite:///./fridgepeace.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_household_code() -> str:
    """Generate a random 4-character alphanumeric household code."""
    import secrets
    import string

    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(4))


# ─── Household ─────────────────────────────────────────────
# Top-level entity. Deleting a household cascades to all its
# members, inventory items, events, and ownerships.

class Household(Base):
    __tablename__ = "household"

    id: Mapped[str] = mapped_column(String(4), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    members: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="household", cascade="all, delete-orphan"
    )
    inventory_items: Mapped[list["FoodInventory"]] = relationship(
        "FoodInventory", back_populates="household", cascade="all, delete-orphan"
    )


# ─── User ──────────────────────────────────────────────────
# Independent user entity. A user can join multiple households
# via HouseholdMember. Username is globally unique.

class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    memberships: Mapped[list["HouseholdMember"]] = relationship(
        "HouseholdMember", back_populates="user", cascade="all, delete-orphan"
    )


# ─── Household Member ──────────────────────────────────────
# Join table between User and Household. A user can be a member
# of multiple households. RESTRICT on delete prevents removing
# members that still have inventory records or events.

class HouseholdMember(Base):
    __tablename__ = "household_member"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
<<<<<<< HEAD
<<<<<<< HEAD
    household_id: Mapped[str] = mapped_column(
        String(4),
=======
    household_id: Mapped[int] = mapped_column(
>>>>>>> 2650f7e (Add User model with unique username, member join/leave endpoints)
=======
    household_id: Mapped[str] = mapped_column(
        String(4),
>>>>>>> 6b644a9 (Changed Household PK from auto-increment integer to a shareable 4-character)
        ForeignKey("household.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="memberships")
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


# ─── Packaged Food ─────────────────────────────────────────
# Store-bought items with barcodes. The barcode column has a
# UNIQUE constraint enforced at both the DB and application level.

class PackagedFood(Base):
    __tablename__ = "packaged_food"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    barcode: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    nutrition: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    inventory_items: Mapped[list["FoodInventory"]] = relationship(
        "FoodInventory", back_populates="packaged_food"
    )


# ─── Unpackaged Food ───────────────────────────────────────
# Fresh items (vegetables, meat, etc.) referenced from the
# FoodKeeper database with estimated shelf-life per storage location.

class UnpackagedFood(Base):
    __tablename__ = "unpackaged_food"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    foodkeeper_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    fridge_days_min: Mapped[Optional[int]] = mapped_column(nullable=True)
    fridge_days_max: Mapped[Optional[int]] = mapped_column(nullable=True)
    freezer_days_min: Mapped[Optional[int]] = mapped_column(nullable=True)
    freezer_days_max: Mapped[Optional[int]] = mapped_column(nullable=True)
    pantry_days_min: Mapped[Optional[int]] = mapped_column(nullable=True)
    pantry_days_max: Mapped[Optional[int]] = mapped_column(nullable=True)

    inventory_items: Mapped[list["FoodInventory"]] = relationship(
        "FoodInventory", back_populates="unpackaged_food"
    )


# ─── Food Inventory ────────────────────────────────────────
# Core table linking a household to a food item. Exactly one of
# packaged_food_id or unpackaged_food_id must be set (enforced by a
# CHECK constraint). SET NULL on food deletion preserves inventory records.

class FoodInventory(Base):
    __tablename__ = "food_inventory"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    household_id: Mapped[str] = mapped_column(
        String(4),
        ForeignKey("household.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    added_by_member_id: Mapped[int] = mapped_column(
        ForeignKey("household_member.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    packaged_food_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("packaged_food.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    unpackaged_food_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("unpackaged_food.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    storage_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    quantity: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
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
    packaged_food: Mapped[Optional["PackagedFood"]] = relationship(
        "PackagedFood", back_populates="inventory_items"
    )
    unpackaged_food: Mapped[Optional["UnpackagedFood"]] = relationship(
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


# ─── Food Event ────────────────────────────────────────────
# Immutable log entry recording an action on an inventory item.
# Supported event types: added, consumed, expired, moved.

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


# ─── Food Ownership ────────────────────────────────────────
# Many-to-many join table between inventory items and members.
# Uses a composite primary key (inventory_item_id, member_id)
# to enforce uniqueness of ownership assignments.

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


Base.metadata.create_all(bind=engine)
