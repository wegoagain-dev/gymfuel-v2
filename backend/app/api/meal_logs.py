"""Consumed meal history and transient food-photo analysis."""

from datetime import datetime
from io import BytesIO
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from PIL import Image, ImageOps, UnidentifiedImageError
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.models.database import MealLog, Recipe, User, get_db
from app.schemas.schemas import (
    FoodComponent,
    MealAnalysisDraft,
    MealLogCreate,
    MealLogResponse,
    MealLogUpdate,
    MealSuggestionRequest,
    MealSuggestionResponse,
    NutritionEstimate,
)
from app.services.openai_lens_service import (
    LensAITimeoutError,
    LensAIUnavailableError,
    LensAIUpstreamError,
    analyze_meal_image,
    generate_meal_suggestion,
)

router = APIRouter()
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_IMAGE_DIMENSION = 1600
ALLOWED_JPEG_TYPES = {"image/jpeg", "image/jpg"}


def _normalize_jpeg(raw: bytes) -> bytes:
    try:
        with Image.open(BytesIO(raw)) as source:
            if source.format != "JPEG":
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="Only JPEG meal photos are supported",
                )
            if source.width * source.height > 25_000_000:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Image dimensions are too large",
                )
            normalized = ImageOps.exif_transpose(source).convert("RGB")
            normalized.thumbnail(
                (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION),
                Image.Resampling.LANCZOS,
            )
            output = BytesIO()
            normalized.save(output, format="JPEG", quality=84, optimize=True)
            return output.getvalue()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The uploaded file is not a valid JPEG image",
        ) from exc


def _response(log: MealLog) -> MealLogResponse:
    return MealLogResponse(
        id=log.id,
        user_id=log.user_id,
        title=log.title,
        foods=[FoodComponent.model_validate(item) for item in (log.foods or [])],
        nutritional_info=NutritionEstimate(
            calories=log.calories,
            protein=log.protein,
            carbs=log.carbs,
            fat=log.fat,
        ),
        eaten_at=log.eaten_at,
        notes=log.notes,
        favorite=log.favorite,
        source_recipe_id=log.source_recipe_id,
        created_at=log.created_at,
        updated_at=log.updated_at,
    )


def _verify_recipe(recipe_id: Optional[int], user_id: int, db: Session) -> None:
    if recipe_id is None:
        return
    exists = db.query(Recipe.id).filter(
        Recipe.id == recipe_id,
        Recipe.user_id == user_id,
    ).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Source recipe not found")


@router.post("/analyze", response_model=MealAnalysisDraft)
async def analyze_photo(
    photo: UploadFile = File(...),
    portion_context: Optional[str] = Form(default=None, max_length=500),
    current_user: User = Depends(get_current_user),
):
    del current_user  # Authentication is required even though the draft is not persisted.
    if photo.content_type not in ALLOWED_JPEG_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG meal photos are supported",
        )
    raw = await photo.read(MAX_UPLOAD_BYTES + 1)
    await photo.close()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Meal photos must be 5 MB or smaller",
        )
    normalized = _normalize_jpeg(raw)
    raw = b""
    try:
        draft = await run_in_threadpool(analyze_meal_image, normalized, portion_context)
    except LensAIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LensAITimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except LensAIUpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        normalized = b""
    return draft


@router.post("/suggest", response_model=MealSuggestionResponse)
async def suggest_meal(
    payload: MealSuggestionRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        recipe = await run_in_threadpool(
            generate_meal_suggestion,
            payload.meal_type,
            payload.available_time_minutes,
            current_user.dietary_restrictions or [],
            current_user.preferences or {},
            payload.remaining_calories,
            payload.remaining_protein,
        )
    except LensAIUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except LensAITimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except LensAIUpstreamError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return MealSuggestionResponse(recipe=recipe)


@router.get("/", response_model=List[MealLogResponse])
async def get_meal_logs(
    start_at: Optional[datetime] = None,
    end_at: Optional[datetime] = None,
    favorite: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if limit < 1 or limit > 200 or skip < 0:
        raise HTTPException(status_code=422, detail="Invalid pagination")
    query = db.query(MealLog).filter(MealLog.user_id == current_user.id)
    if start_at:
        query = query.filter(MealLog.eaten_at >= start_at)
    if end_at:
        query = query.filter(MealLog.eaten_at < end_at)
    if favorite is not None:
        query = query.filter(MealLog.favorite == favorite)
    logs = query.order_by(MealLog.eaten_at.desc()).offset(skip).limit(limit).all()
    return [_response(log) for log in logs]


@router.post("/", response_model=MealLogResponse, status_code=status.HTTP_201_CREATED)
async def create_meal_log(
    payload: MealLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_recipe(payload.source_recipe_id, current_user.id, db)
    nutrition = payload.nutritional_info
    log = MealLog(
        user_id=current_user.id,
        title=payload.title.strip(),
        foods=[food.model_dump() for food in payload.foods],
        calories=nutrition.calories,
        protein=nutrition.protein,
        carbs=nutrition.carbs,
        fat=nutrition.fat,
        eaten_at=payload.eaten_at,
        notes=payload.notes,
        favorite=payload.favorite,
        source_recipe_id=payload.source_recipe_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return _response(log)


@router.patch("/{meal_log_id}", response_model=MealLogResponse)
async def update_meal_log(
    meal_log_id: int,
    payload: MealLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(MealLog).filter(
        MealLog.id == meal_log_id,
        MealLog.user_id == current_user.id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Meal log not found")

    changes = payload.model_dump(exclude_unset=True)
    for required_key in ("title", "foods", "nutritional_info", "eaten_at", "favorite"):
        if required_key in changes and changes[required_key] is None:
            raise HTTPException(status_code=422, detail=f"{required_key} cannot be null")
    if "source_recipe_id" in changes:
        _verify_recipe(changes["source_recipe_id"], current_user.id, db)
    nutrition = changes.pop("nutritional_info", None)
    foods = changes.pop("foods", None)
    if nutrition is not None:
        for key in ("calories", "protein", "carbs", "fat"):
            setattr(log, key, nutrition[key])
    if foods is not None:
        log.foods = foods
    for key, value in changes.items():
        if key == "title" and value is not None:
            value = value.strip()
        setattr(log, key, value)
    db.commit()
    db.refresh(log)
    return _response(log)


@router.delete("/{meal_log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meal_log(
    meal_log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(MealLog).filter(
        MealLog.id == meal_log_id,
        MealLog.user_id == current_user.id,
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Meal log not found")
    db.delete(log)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
