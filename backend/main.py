from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_scanning.router import router as ai_scanning_router
import models
from routers import router

# App entry point: register all routes and expose a health check endpoint.

app = FastAPI(title="FridgePeace API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://fridgepeace.me","http://localhost:4040",],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(ai_scanning_router)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FridgePeace API is running"}
