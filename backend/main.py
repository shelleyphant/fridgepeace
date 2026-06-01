from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
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


@app.on_event("startup")
def on_startup():
    seed_foodkeeper()


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FridgePeace API is running"}
