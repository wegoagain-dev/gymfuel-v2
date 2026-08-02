"""OpenAI-backed, transient AI operations for GymFuel Lens."""

import base64
import json
from typing import Any, Iterable, Optional

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
    RateLimitError,
)

from app.core.config import settings
from app.schemas.schemas import (
    GeneratedGymRecipe,
    MealAnalysisDraft,
    MealSuggestionResponse,
    PantryGenerationResponse,
)


class LensAIUnavailableError(RuntimeError):
    """The feature has not been configured on this deployment."""


class LensAIUpstreamError(RuntimeError):
    """The configured model provider did not produce a usable response."""


class LensAITimeoutError(LensAIUpstreamError):
    """The configured model provider did not respond before the timeout."""


def _client() -> OpenAI:
    if not settings.OPENAI_API_KEY:
        raise LensAIUnavailableError("GymFuel Lens AI is not configured")
    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=35.0,
        max_retries=1,
    )


def _parsed_response(response, response_type):
    parsed = getattr(response, "output_parsed", None)
    if parsed is None:
        raise LensAIUpstreamError("The AI response could not be parsed")
    if isinstance(parsed, response_type):
        return parsed
    return response_type.model_validate(parsed)


def analyze_meal_image(
    image_bytes: bytes,
    portion_context: Optional[str] = None,
) -> MealAnalysisDraft:
    """Analyze one normalized JPEG. The bytes are never persisted by this service."""

    context = portion_context.strip() if portion_context else "No extra portion context supplied."
    encoded_image = base64.b64encode(image_bytes).decode("ascii")
    prompt = (
        "Analyze this single meal photo for a gym nutrition journal. Draft a concise meal title, "
        "the visible food components and likely portions, and estimated total calories, protein, "
        "carbohydrates, and fat for the entire pictured serving. Never claim exact nutritional "
        "accuracy. Put uncertainty, hidden ingredients, sauces, cooking oils, and portion assumptions "
        f"in assumptions. User context: {context}"
    )

    try:
        response = _client().responses.parse(
            model=settings.OPENAI_MEAL_ANALYSIS_MODEL,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are a cautious food-photo assistant. Return only the requested structured "
                        "draft. Do not provide medical advice or invent certainty."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {
                            "type": "input_image",
                            "image_url": f"data:image/jpeg;base64,{encoded_image}",
                            "detail": "high",
                        },
                    ],
                },
            ],
            text_format=MealAnalysisDraft,
            store=False,
        )
        return _parsed_response(response, MealAnalysisDraft)
    except LensAIUnavailableError:
        raise
    except APITimeoutError as exc:
        raise LensAITimeoutError("Meal analysis timed out; please retry") from exc
    except (APIConnectionError, RateLimitError, APIStatusError) as exc:
        raise LensAIUpstreamError("Meal analysis is temporarily unavailable") from exc
    except LensAIUpstreamError:
        raise
    except Exception as exc:
        raise LensAIUpstreamError("Meal analysis returned an invalid response") from exc


def generate_pantry_recipes(
    pantry_names: Iterable[str],
    goal: str,
    meal_type: str,
    dietary_restrictions: Iterable[str],
    meal_preferences: Optional[dict[str, Any]] = None,
) -> list[GeneratedGymRecipe]:
    pantry = [name.strip() for name in pantry_names if name.strip()]
    restrictions = [item.strip() for item in dietary_restrictions if item.strip()]
    preferences = meal_preferences or {}
    cuisines = [
        item.strip()
        for item in preferences.get("preferred_cuisines", [])
        if isinstance(item, str) and item.strip()
    ]
    disliked = [
        item.strip()
        for item in preferences.get("disliked_ingredients", [])
        if isinstance(item, str) and item.strip()
    ]
    max_prep_time = preferences.get("max_prep_time_minutes")
    if not isinstance(max_prep_time, int):
        max_prep_time = None
    pantry_json = json.dumps(pantry, ensure_ascii=True)
    restrictions_json = json.dumps(restrictions, ensure_ascii=True)
    cuisines_json = json.dumps(cuisines, ensure_ascii=True)
    disliked_json = json.dumps(disliked, ensure_ascii=True)
    time_constraint = (
        f" Keep total prep and cook time within {max_prep_time} minutes."
        if max_prep_time
        else ""
    )
    prompt = (
        f"Create exactly three distinct {meal_type} recipes for a user whose fitness goal is {goal}. "
        "Make every recipe high in protein and adjust calorie density sensibly: lighter for cut, "
        "balanced for maintain, and more calorie-dense for bulk. Prioritize the supplied pantry. "
        "If the pantry is empty, still create practical recipes using the saved preferences. "
        "A recipe may need at most three ingredients not in the pantry; list those explicitly in "
        "missing_ingredients. Never use an ingredient the user dislikes. Treat preferred cuisines "
        "as inspiration rather than a strict requirement. Nutritional values are estimated per serving."
        f"{time_constraint} Pantry: {pantry_json}. Dietary restrictions: {restrictions_json}. "
        f"Preferred cuisines: {cuisines_json}. Ingredients to avoid: {disliked_json}."
    )

    try:
        response = _client().responses.parse(
            model=settings.OPENAI_RECIPE_MODEL,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are a practical fitness-focused recipe generator. Respect every dietary "
                        "restriction and return only the requested structured recipes."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            text_format=PantryGenerationResponse,
            store=False,
        )
        parsed = _parsed_response(response, PantryGenerationResponse)
    except LensAIUnavailableError:
        raise
    except APITimeoutError as exc:
        raise LensAITimeoutError("Recipe generation timed out; please retry") from exc
    except (APIConnectionError, RateLimitError, APIStatusError) as exc:
        raise LensAIUpstreamError("Recipe generation is temporarily unavailable") from exc
    except LensAIUpstreamError:
        raise
    except Exception as exc:
        raise LensAIUpstreamError("Recipe generation returned an invalid response") from exc

    normalized_pantry = {" ".join(name.casefold().split()) for name in pantry}
    recipes: list[GeneratedGymRecipe] = []
    for recipe in parsed.recipes:
        ingredients = [
            ingredient.model_copy(
                update={
                    "available_in_pantry": " ".join(ingredient.name.casefold().split())
                    in normalized_pantry
                }
            )
            for ingredient in recipe.ingredients
        ]
        recipes.append(recipe.model_copy(update={"ingredients": ingredients}))
    return recipes


def generate_meal_suggestion(
    meal_type: str,
    available_time_minutes: int,
    dietary_restrictions: Iterable[str],
    meal_preferences: Optional[dict[str, Any]] = None,
    remaining_calories: Optional[float] = None,
    remaining_protein: Optional[float] = None,
) -> GeneratedGymRecipe:
    """Generate one decisive meal idea without requiring pantry inventory."""

    restrictions = [item.strip() for item in dietary_restrictions if item.strip()]
    preferences = meal_preferences or {}
    cuisines = [
        item.strip()
        for item in preferences.get("preferred_cuisines", [])
        if isinstance(item, str) and item.strip()
    ]
    disliked = [
        item.strip()
        for item in preferences.get("disliked_ingredients", [])
        if isinstance(item, str) and item.strip()
    ]
    goal = preferences.get("fitness_goal", "maintain")
    if goal not in {"cut", "maintain", "bulk"}:
        goal = "maintain"
    profile_time = preferences.get("max_prep_time_minutes")
    total_time = min(
        available_time_minutes,
        profile_time if isinstance(profile_time, int) else available_time_minutes,
    )
    remaining_context = (
        "No remaining daily target context is available."
        if remaining_calories is None and remaining_protein is None
        else (
            "Remaining against the user's own daily targets is approximately "
            f"{remaining_calories if remaining_calories is not None else 'unknown'} kcal and "
            f"{remaining_protein if remaining_protein is not None else 'unknown'} g protein. "
            "Use this only as context; the meal does not need to consume the full remainder."
        )
    )
    prompt = (
        f"Choose one complete {meal_type} for a user with a {goal} fitness goal who has no idea "
        f"what to make. Keep total prep and cook time within {total_time} minutes. Make it practical, "
        "high in protein, and return one serving with concise instructions. Adjust calorie density "
        "sensibly for the goal. Respect all dietary restrictions and never use disliked ingredients. "
        "Use preferred cuisines as inspiration, not a strict requirement. Nutritional values are "
        "estimates per serving. This is not a pantry comparison, so set available_in_pantry to false "
        "and missing_ingredients to an empty list. "
        f"Dietary restrictions: {json.dumps(restrictions, ensure_ascii=True)}. "
        f"Preferred cuisines: {json.dumps(cuisines, ensure_ascii=True)}. "
        f"Ingredients to avoid: {json.dumps(disliked, ensure_ascii=True)}. {remaining_context}"
    )

    try:
        response = _client().responses.parse(
            model=settings.OPENAI_RECIPE_MODEL,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You are a decisive fitness-focused meal assistant. Give one useful answer, "
                        "respect user preferences, avoid medical advice, and return only the requested "
                        "structured recipe."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            text_format=MealSuggestionResponse,
            store=False,
        )
        parsed = _parsed_response(response, MealSuggestionResponse)
        return parsed.recipe
    except LensAIUnavailableError:
        raise
    except APITimeoutError as exc:
        raise LensAITimeoutError("Meal suggestion timed out; please retry") from exc
    except (APIConnectionError, RateLimitError, APIStatusError) as exc:
        raise LensAIUpstreamError("Meal suggestions are temporarily unavailable") from exc
    except LensAIUpstreamError:
        raise
    except Exception as exc:
        raise LensAIUpstreamError("Meal suggestion returned an invalid response") from exc
