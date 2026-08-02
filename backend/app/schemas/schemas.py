from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
import datetime as dt
from datetime import datetime, date


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: str = "client"  # 'client' or 'coach'
    dietary_restrictions: List[str] = []
    preferences: Dict[str, Any] = {}


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one number')
        return v


class UserResponse(UserBase):
    id: int
    family_id: Optional[int] = None
    client_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class RecipeBase(BaseModel):
    title: str
    description: Optional[str] = None
    instructions: str
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    image_url: Optional[str] = None
    source_url: Optional[str] = None
    tags: List[str] = []
    ingredients: List[Dict[str, Any]] = []
    nutritional_info: Dict[str, Any] = {}


class RecipeCreate(RecipeBase):
    pass


class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    servings: Optional[int] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    ingredients: Optional[List[Dict[str, Any]]] = None


class RecipeResponse(RecipeBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MealBase(BaseModel):
    date: date
    meal_type: str  # breakfast, lunch, dinner, snack
    recipe_id: Optional[int] = None
    notes: Optional[str] = None
    planned: bool = True


class MealCreate(MealBase):
    pass


class MealUpdate(BaseModel):
    date: Optional[dt.date] = None
    meal_type: Optional[str] = None
    recipe_id: Optional[int] = None
    notes: Optional[str] = None
    planned: Optional[bool] = None


class MealResponse(MealBase):
    id: int
    user_id: int
    created_at: datetime
    recipe: Optional[RecipeResponse] = None

    class Config:
        from_attributes = True


class GroceryItemBase(BaseModel):
    name: str
    quantity: float = 1.0
    unit: Optional[str] = None
    category: Optional[str] = None
    expiration_date: Optional[date] = None


class GroceryItemCreate(GroceryItemBase):
    pass


class GroceryItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    expiration_date: Optional[date] = None


class GroceryItemResponse(GroceryItemBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Coach Feature Schemas ============

class LinkClientRequest(BaseModel):
    """Request to link a client to a coach"""
    client_email: EmailStr
    client_code: str


class ClientSummary(BaseModel):
    """Summary of a client for coach dashboard"""
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class CoachSummary(BaseModel):
    """Summary of a coach for client view"""
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None

    class Config:
        from_attributes = True


class CoachClientResponse(BaseModel):
    """Response for coach-client relationship"""
    id: int
    coach: CoachSummary
    client: ClientSummary
    created_at: datetime

    class Config:
        from_attributes = True


# ============ GymFuel Lens Schemas ============

class FoodComponent(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    portion: Optional[str] = Field(default=None, max_length=120)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Food name is required")
        return cleaned

    @field_validator("portion")
    @classmethod
    def clean_portion(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return " ".join(value.split()) or None


class NutritionEstimate(BaseModel):
    calories: float = Field(default=0, ge=0, le=10000)
    protein: float = Field(default=0, ge=0, le=1000)
    carbs: float = Field(default=0, ge=0, le=2000)
    fat: float = Field(default=0, ge=0, le=1000)


class MealAnalysisDraft(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    foods: List[FoodComponent] = Field(..., min_length=1, max_length=30)
    nutritional_info: NutritionEstimate
    assumptions: List[str] = Field(default_factory=list, max_length=10)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Meal title is required")
        return cleaned


class MealLogCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    foods: List[FoodComponent] = Field(..., min_length=1, max_length=30)
    nutritional_info: NutritionEstimate
    eaten_at: datetime
    notes: Optional[str] = Field(default=None, max_length=2000)
    favorite: bool = False
    source_recipe_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Meal title is required")
        return cleaned

    @field_validator("eaten_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("eaten_at must include a timezone")
        return value


class MealLogUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    foods: Optional[List[FoodComponent]] = Field(default=None, max_length=30)
    nutritional_info: Optional[NutritionEstimate] = None
    eaten_at: Optional[datetime] = None
    notes: Optional[str] = Field(default=None, max_length=2000)
    favorite: Optional[bool] = None
    source_recipe_id: Optional[int] = None

    @field_validator("title")
    @classmethod
    def clean_optional_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Meal title is required")
        return cleaned

    @field_validator("eaten_at")
    @classmethod
    def require_optional_timezone(cls, value: Optional[datetime]) -> Optional[datetime]:
        if value is not None and (value.tzinfo is None or value.utcoffset() is None):
            raise ValueError("eaten_at must include a timezone")
        return value


class MealLogResponse(BaseModel):
    id: int
    user_id: int
    title: str
    foods: List[FoodComponent]
    nutritional_info: NutritionEstimate
    eaten_at: datetime
    notes: Optional[str] = None
    favorite: bool
    source_recipe_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class PantryIngredientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def normalize_whitespace(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Ingredient name is required")
        return cleaned


class PantryIngredientResponse(BaseModel):
    id: int
    user_id: int
    name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PantryGenerateRequest(BaseModel):
    goal: Literal["cut", "maintain", "bulk"]
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]


class GeneratedIngredient(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    quantity: float = Field(default=1, gt=0, le=10000)
    unit: str = Field(default="", max_length=40)
    available_in_pantry: bool = False


class GeneratedGymRecipe(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    instructions: str = Field(..., min_length=1, max_length=10000)
    prep_time: int = Field(default=0, ge=0, le=1440)
    cook_time: int = Field(default=0, ge=0, le=1440)
    servings: int = Field(default=1, ge=1, le=50)
    difficulty: Literal["easy", "medium", "hard"] = "easy"
    tags: List[str] = Field(default_factory=list, max_length=12)
    ingredients: List[GeneratedIngredient] = Field(..., min_length=1, max_length=40)
    nutritional_info: NutritionEstimate
    missing_ingredients: List[str] = Field(default_factory=list, max_length=3)


class PantryGenerationResponse(BaseModel):
    recipes: List[GeneratedGymRecipe] = Field(..., min_length=3, max_length=3)

    @field_validator("recipes")
    @classmethod
    def require_distinct_recipes(
        cls,
        recipes: List[GeneratedGymRecipe],
    ) -> List[GeneratedGymRecipe]:
        titles = {" ".join(recipe.title.casefold().split()) for recipe in recipes}
        if len(titles) != len(recipes):
            raise ValueError("Generated recipes must have distinct titles")
        return recipes


class MealSuggestionRequest(BaseModel):
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    available_time_minutes: int = Field(default=30, ge=10, le=180)
    remaining_calories: Optional[float] = Field(default=None, ge=0, le=10000)
    remaining_protein: Optional[float] = Field(default=None, ge=0, le=1000)


class MealSuggestionResponse(BaseModel):
    recipe: GeneratedGymRecipe


class NutritionTargetsUpdate(BaseModel):
    daily_calorie_target: float = Field(..., ge=500, le=10000)
    daily_protein_target: float = Field(..., ge=10, le=1000)


class NutritionTargetsResponse(NutritionTargetsUpdate):
    pass


class MealPreferencesUpdate(BaseModel):
    dietary_restrictions: List[str] = Field(default_factory=list, max_length=30)
    preferred_cuisines: List[str] = Field(default_factory=list, max_length=12)
    disliked_ingredients: List[str] = Field(default_factory=list, max_length=30)
    max_prep_time_minutes: Optional[int] = Field(default=None, ge=5, le=240)
    fitness_goal: Literal["cut", "maintain", "bulk"] = "maintain"

    @field_validator(
        "dietary_restrictions",
        "preferred_cuisines",
        "disliked_ingredients",
    )
    @classmethod
    def normalize_preference_items(cls, items: List[str]) -> List[str]:
        normalized: List[str] = []
        seen: set[str] = set()
        for item in items:
            cleaned = " ".join(item.strip().split())
            key = cleaned.casefold()
            if cleaned and key not in seen:
                normalized.append(cleaned)
                seen.add(key)
        return normalized


class MealPreferencesResponse(MealPreferencesUpdate):
    pass
