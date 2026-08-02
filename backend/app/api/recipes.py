from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import google.generativeai as genai
import json
import logging

from app.models.database import get_db, Recipe, User, Meal, MealLog
from app.schemas.schemas import RecipeCreate, RecipeUpdate, RecipeResponse
from app.api.auth import get_current_user
from app.core.config import settings

router = APIRouter()
gemini_model = None
logger = logging.getLogger(__name__)

# Set up Gemini AI if the API key is configured
# This will be used for AI recipe generation later
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-1.5-flash")


@router.get("/", response_model=List[RecipeResponse])
async def get_recipes(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get user's recipes with optional search and filtering
    query = db.query(Recipe).filter(Recipe.user_id == current_user.id)
    
    if search:
        query = query.filter(Recipe.title.ilike(f"%{search}%"))
    
    if tags:
        tag_list = tags.split(",")
        for tag in tag_list:
            query = query.filter(Recipe.tags.contains([tag.strip()]))
    
    if difficulty:
        query = query.filter(Recipe.difficulty == difficulty)
    
    recipes = query.offset(skip).limit(limit).all()
    return recipes


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.user_id == current_user.id
    ).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.post("/", response_model=RecipeResponse)
async def create_recipe(
    recipe: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    recipe_data = recipe.model_dump()
    
    # If no image was provided, fetch one automatically from Unsplash
    if not recipe_data.get("image_url"):
        from app.services.image_service import get_meal_image
        image_url = await get_meal_image(recipe_data["title"])
        if image_url:
            recipe_data["image_url"] = image_url
    
    db_recipe = Recipe(**recipe_data, user_id=current_user.id)
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(
    recipe_id: int,
    recipe: RecipeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.user_id == current_user.id
    ).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    update_data = recipe.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_recipe, field, value)
    
    db.commit()
    db.refresh(db_recipe)
    return db_recipe


@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.user_id == current_user.id
    ).first()
    if not db_recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Clear recipe_id from meals that reference this recipe
    db.query(Meal).filter(Meal.recipe_id == recipe_id).update({"recipe_id": None})
    db.query(MealLog).filter(MealLog.source_recipe_id == recipe_id).update(
        {"source_recipe_id": None}
    )
    db.commit()
    
    db.delete(db_recipe)
    db.commit()
    return {"message": "Recipe deleted successfully"}


@router.post("/ai/generate", response_model=RecipeCreate)
async def generate_recipe_ai(
    prompt: str = Query(..., description="Describe the recipe you want"),
    dietary_restrictions: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not gemini_model:
        raise HTTPException(status_code=503, detail="Gemini API not configured")
    
    restrictions_text = ""
    if dietary_restrictions:
        restrictions_text = f"Dietary restrictions: {dietary_restrictions}. "
    
    system_prompt = """You are a fitness nutrition expert and chef specializing in high-protein meals for gym-goers.
    Generate recipes that prioritise protein (aim for 30-50g per serving) and support muscle growth/recovery.
    Return the recipe ONLY as a valid JSON object with this exact structure (no markdown, no text before/after):
    {
        "title": "Recipe Name",
        "description": "Brief description highlighting protein content and fitness benefits",
        "instructions": "Step by step instructions",
        "prep_time": 30,
        "cook_time": 45,
        "servings": 4,
        "difficulty": "easy",
        "ingredients": [{"name": "ingredient", "quantity": 1, "unit": "cup"}],
        "tags": ["high-protein", "gym-fuel", "muscle-building"],
        "nutritional_info": {"calories": 500, "protein": 40, "carbs": 30, "fat": 15}
    }"""
    
    user_prompt = f"Generate a HIGH PROTEIN recipe for: {prompt}. {restrictions_text}Focus on lean proteins and whole foods ideal for gym-goers."
    
    try:
        response = gemini_model.generate_content(f"{system_prompt}\n\nUser request: {user_prompt}")
        response_text = response.text.strip()
        
        # Clean potential markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        recipe_data = json.loads(response_text)
        return RecipeCreate(**recipe_data)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse recipe JSON: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recipe. Please try again.")
    except Exception as e:
        logger.error(f"Recipe generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate recipe. Please try again.")


@router.post("/ai/suggest")
async def suggest_recipes_ai(
    pantry_items: Optional[List[str]] = None,
    preferences: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not gemini_model:
        raise HTTPException(status_code=503, detail="Gemini API not configured")
    
    pantry_text = f"Pantry items: {', '.join(pantry_items) if pantry_items else 'No specific items'}."
    pref_text = f"Preferences: {preferences}" if preferences else ""
    
    system_prompt = """You are a fitness nutrition expert who suggests HIGH-PROTEIN recipes for gym-goers.
    Return suggestions ONLY as a valid JSON object (no markdown) with this structure:
    {"suggestions": [{"title": "Recipe Name", "description": "Brief description with estimated protein content", "protein_estimate": "40g"}]}
    Provide exactly 3 suggestions. Each must be high in protein (30g+ per serving)."""
    
    user_prompt = f"{pantry_text} {pref_text} Suggest 3 high-protein recipes I can make for muscle building."
    
    try:
        response = gemini_model.generate_content(f"{system_prompt}\n\nUser request: {user_prompt}")
        response_text = response.text.strip()
        
        # Clean potential markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        suggestions = json.loads(response_text)
        return suggestions
    except Exception as e:
        logger.error(f"Failed to generate suggestions: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate suggestions. Please try again.")
