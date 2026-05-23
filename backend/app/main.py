from fastapi import FastAPI

from app.database import engine, Base
from app.routers import (
    household_router,
    household_member_router,
    packaged_food_router,
    unpackaged_food_router,
    food_inventory_router,
    food_event_router,
    food_ownership_router,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FridgePeace API", version="0.1.0")

app.include_router(household_router)
app.include_router(household_member_router)
app.include_router(packaged_food_router)
app.include_router(unpackaged_food_router)
app.include_router(food_inventory_router)
app.include_router(food_event_router)
app.include_router(food_ownership_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FridgePeace API is running"}
