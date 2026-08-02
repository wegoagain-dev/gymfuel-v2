import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, coach, groceries, meal_logs, meals, pantry, recipes, websocket

app = FastAPI(
    title="GymFuel API",
    description="Smart meal planning & grocery management platform",
    version="1.0.0",
    # Disable automatic redirects for trailing slashes - these cause 307 redirects
    # that strip the Authorization header, breaking authenticated API calls
    redirect_slashes=False,
)

# CORS Configuration
# Parse ALLOWED_ORIGINS from environment variable
# Default: localhost for local development
# Production: empty string = no CORS middleware (same-origin via ALB)
allowed_origins_env = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"
)

if allowed_origins_env and allowed_origins_env.strip():
    ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_env.split(",")]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,  # Safe with specific origins
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["*"],
    )
else:
    # No CORS middleware in production (same-origin via ALB path-based routing)
    # This is the most secure option - all requests come from same origin
    pass

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])
app.include_router(meals.router, prefix="/api/meals", tags=["meals"])
app.include_router(groceries.router, prefix="/api/groceries", tags=["groceries"])
app.include_router(coach.router, prefix="/api/coach", tags=["coach"])
app.include_router(meal_logs.router, prefix="/api/meal-logs", tags=["meal-logs"])
app.include_router(pantry.router, prefix="/api/pantry", tags=["pantry"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])


@app.get("/")
async def root():
    return {"message": "GymFuel API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
