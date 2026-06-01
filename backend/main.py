from fastapi import FastAPI

import models
from routers import router
from seed_foodkeeper import seed_foodkeeper

# App entry point: register all routes and expose a health check endpoint.

app = FastAPI(title="FridgePeace API", version="0.1.0")

app.include_router(router)


@app.on_event("startup")
def on_startup():
    seed_foodkeeper()


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FridgePeace API is running"}
