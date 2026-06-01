from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

import models
from models import (
    Base,
    FoodKeeperCategory,
    FoodKeeperCookingMethod,
    FoodKeeperCookingTip,
    FoodKeeperProduct,
    engine,
)
from routers import router
from seed_foodkeeper import seed_foodkeeper

# App entry point: register all routes and expose a health check endpoint.

app = FastAPI(title="FridgePeace API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


def _needs_migration():
    """Check if the FoodKeeperProduct table needs schema migration."""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    if "foodkeeper_product" not in tables:
        return True
    columns = [col["name"] for col in inspector.get_columns("foodkeeper_product")]
    return "keywords" not in columns


def _run_migration():
    """Drop old tables and recreate with new schema."""
    print("[migration] Detected old schema, dropping and recreating tables...")
    FoodKeeperProduct.__table__.drop(engine, checkfirst=True)
    FoodKeeperCategory.__table__.drop(engine, checkfirst=True)
    FoodKeeperCookingTip.__table__.drop(engine, checkfirst=True)
    FoodKeeperCookingMethod.__table__.drop(engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)
    print("[migration] Tables recreated with new schema")


@app.on_event("startup")
def on_startup():
    if _needs_migration():
        _run_migration()
    seed_foodkeeper()


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FridgePeace API is running"}
