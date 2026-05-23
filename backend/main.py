from fastapi import FastAPI

import models
from routers import router

app = FastAPI(title="FridgePeace API", version="0.1.0")

app.include_router(router)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FridgePeace API is running"}
