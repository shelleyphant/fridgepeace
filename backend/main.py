from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models
from routers import router

# App entry point: register all routes and expose a health check endpoint.

app = FastAPI(title="FridgePeace API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://fridgepeace.me"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FridgePeace API is running"}
