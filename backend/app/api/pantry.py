"""Simple pantry inventory and goal-aware GymFuel recipe generation."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.models.database import PantryIngredient, User, get_db
from app.schemas.schemas import (
    PantryGenerateRequest,
    PantryGenerationResponse,
    PantryIngredientCreate,
    PantryIngredientResponse,
)
from app.services.openai_lens_service import (
    LensAITimeoutError,
    LensAIUnavailableError,
    LensAIUpstreamError,
    generate_pantry_recipes,
)

router = APIRouter()


def _normalized_name(name: str) -> str:
    return " ".join(name.casefold().split())


@router.get("/", response_model=List[PantryIngredientResponse])
async def get_pantry(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(PantryIngredient).filter(
        PantryIngredient.user_id == current_user.id
    ).order_by(PantryIngredient.name.asc()).all()


@router.post(
    "/",
    response_model=PantryIngredientResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_pantry_ingredient(
    payload: PantryIngredientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = " ".join(payload.name.split())
    ingredient = PantryIngredient(
        user_id=current_user.id,
        name=name,
        normalized_name=_normalized_name(name),
    )
    db.add(ingredient)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Ingredient is already in your groceries") from exc
    db.refresh(ingredient)
    return ingredient


@router.delete("/{ingredient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pantry_ingredient(
    ingredient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ingredient = db.query(PantryIngredient).filter(
        PantryIngredient.id == ingredient_id,
        PantryIngredient.user_id == current_user.id,
    ).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Grocery ingredient not found")
    db.delete(ingredient)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/generate", response_model=PantryGenerationResponse)
async def generate_gym_meals(
    payload: PantryGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pantry = db.query(PantryIngredient).filter(
        PantryIngredient.user_id == current_user.id
    ).order_by(PantryIngredient.name.asc()).all()
    try:
        recipes = await run_in_threadpool(
            generate_pantry_recipes,
            [ingredient.name for ingredient in pantry],
            payload.goal,
            payload.meal_type,
            current_user.dietary_restrictions or [],
            current_user.preferences or {},
        )
    except LensAIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LensAITimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except LensAIUpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return PantryGenerationResponse(recipes=recipes)
