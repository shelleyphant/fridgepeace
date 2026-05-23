from app.routers.household import router as household_router
from app.routers.household_member import router as household_member_router
from app.routers.packaged_food import router as packaged_food_router
from app.routers.unpackaged_food import router as unpackaged_food_router
from app.routers.food_inventory import router as food_inventory_router
from app.routers.food_event import router as food_event_router
from app.routers.food_ownership import router as food_ownership_router

__all__ = [
    "household_router",
    "household_member_router",
    "packaged_food_router",
    "unpackaged_food_router",
    "food_inventory_router",
    "food_event_router",
    "food_ownership_router",
]
