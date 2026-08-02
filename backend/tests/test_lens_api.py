from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from types import SimpleNamespace

import pytest
from PIL import Image

from app.api import meal_logs, pantry
from app.api.auth import get_current_user
from app.main import app
from app.models.database import User
from app.schemas.schemas import (
    FoodComponent,
    GeneratedGymRecipe,
    GeneratedIngredient,
    MealAnalysisDraft,
    MealSuggestionResponse,
    NutritionEstimate,
)
from app.services import openai_lens_service
from app.services.openai_lens_service import (
    LensAITimeoutError,
    LensAIUnavailableError,
    LensAIUpstreamError,
)
from tests.conftest import TestingSession, override_current_user


def meal_payload(title="Chicken bowl"):
    return {
        "title": title,
        "foods": [{"name": "Chicken", "portion": "200g"}],
        "nutritional_info": {"calories": 620, "protein": 52, "carbs": 64, "fat": 14},
        "eaten_at": datetime.now(timezone.utc).isoformat(),
        "notes": "Post workout",
        "favorite": False,
    }


def generated_recipe(index: int) -> GeneratedGymRecipe:
    return GeneratedGymRecipe(
        title=f"Gym meal {index}",
        description="High-protein pantry meal",
        instructions="Cook and combine.",
        prep_time=10,
        cook_time=20,
        servings=1,
        difficulty="easy",
        tags=["high-protein"],
        ingredients=[
            GeneratedIngredient(
                name="Chicken",
                quantity=200,
                unit="g",
                available_in_pantry=True,
            )
        ],
        nutritional_info=NutritionEstimate(calories=600, protein=50, carbs=60, fat=12),
        missing_ingredients=[],
    )


def jpeg_bytes(size=(800, 600), with_metadata=False) -> bytes:
    output = BytesIO()
    image = Image.new("RGB", size, color=(80, 120, 60))
    exif = Image.Exif()
    if with_metadata:
        exif[270] = "private meal note"
    image.save(output, format="JPEG", exif=exif)
    return output.getvalue()


def test_lens_routes_require_authentication(client):
    previous = app.dependency_overrides.pop(get_current_user)
    try:
        response = client.get("/api/meal-logs/")
    finally:
        app.dependency_overrides[get_current_user] = previous or override_current_user
    assert response.status_code == 401


def test_pantry_is_user_scoped_and_case_insensitive(client, switch_user):
    created = client.post("/api/pantry/", json={"name": "Chicken Breast"})
    assert created.status_code == 201
    duplicate = client.post("/api/pantry/", json={"name": " chicken   breast "})
    assert duplicate.status_code == 409

    ingredient_id = created.json()["id"]
    switch_user(2)
    assert client.get("/api/pantry/").json() == []
    assert client.delete(f"/api/pantry/{ingredient_id}").status_code == 404


def test_meal_logs_require_confirmation_and_enforce_ownership(client, switch_user):
    created = client.post("/api/meal-logs/", json=meal_payload())
    assert created.status_code == 201
    meal_id = created.json()["id"]
    assert client.get("/api/meal-logs/").json()[0]["title"] == "Chicken bowl"

    switch_user(2)
    assert client.get("/api/meal-logs/").json() == []
    assert client.patch(f"/api/meal-logs/{meal_id}", json={"favorite": True}).status_code == 404
    assert client.delete(f"/api/meal-logs/{meal_id}").status_code == 404


def test_meal_log_patch_rejects_null_required_fields(client):
    created = client.post("/api/meal-logs/", json=meal_payload())
    meal_id = created.json()["id"]
    response = client.patch(f"/api/meal-logs/{meal_id}", json={"title": None})
    assert response.status_code == 422
    assert client.get("/api/meal-logs/").json()[0]["title"] == "Chicken bowl"


def test_nutrition_targets_merge_existing_preferences(client):
    response = client.patch(
        "/api/auth/me/nutrition-targets",
        json={"daily_calorie_target": 2400, "daily_protein_target": 180},
    )
    assert response.status_code == 200
    with TestingSession() as db:
        preferences = db.get(User, 1).preferences
        assert preferences["theme"] == "dark"
        assert preferences["daily_calorie_target"] == 2400
        assert preferences["daily_protein_target"] == 180


def test_meal_preferences_are_normalized_and_preserve_targets(client):
    client.patch(
        "/api/auth/me/nutrition-targets",
        json={"daily_calorie_target": 2400, "daily_protein_target": 180},
    )
    response = client.patch(
        "/api/auth/me/meal-preferences",
        json={
            "dietary_restrictions": [" Vegetarian ", "vegetarian"],
            "preferred_cuisines": [" Mexican ", "Thai"],
            "disliked_ingredients": ["Mushrooms", " mushrooms "],
            "max_prep_time_minutes": 35,
        },
    )
    assert response.status_code == 200
    assert response.json()["dietary_restrictions"] == ["Vegetarian"]
    with TestingSession() as db:
        user = db.get(User, 1)
        assert user.dietary_restrictions == ["Vegetarian"]
        assert user.preferences["theme"] == "dark"
        assert user.preferences["daily_calorie_target"] == 2400
        assert user.preferences["preferred_cuisines"] == ["Mexican", "Thai"]
        assert user.preferences["disliked_ingredients"] == ["Mushrooms"]
        assert user.preferences["max_prep_time_minutes"] == 35
        assert user.preferences["fitness_goal"] == "maintain"


def test_photo_analysis_validates_jpeg_and_returns_unsaved_draft(client, monkeypatch):
    invalid = client.post(
        "/api/meal-logs/analyze",
        files={"photo": ("meal.png", b"not-an-image", "image/png")},
    )
    assert invalid.status_code == 415

    oversized = client.post(
        "/api/meal-logs/analyze",
        files={"photo": ("meal.jpg", b"x" * (5 * 1024 * 1024 + 1), "image/jpeg")},
    )
    assert oversized.status_code == 413

    def fake_analyze(image: bytes, context: str | None):
        assert image.startswith(b"\xff\xd8")
        assert context == "large serving"
        with Image.open(BytesIO(image)) as normalized:
            assert max(normalized.size) <= 1600
            assert not normalized.getexif()
        return MealAnalysisDraft(
            title="Chicken and rice",
            foods=[FoodComponent(name="Chicken", portion="200g")],
            nutritional_info=NutritionEstimate(calories=650, protein=55, carbs=70, fat=14),
            assumptions=["Oil is estimated"],
        )

    monkeypatch.setattr(meal_logs, "analyze_meal_image", fake_analyze)
    response = client.post(
        "/api/meal-logs/analyze",
        files={
            "photo": (
                "meal.jpg",
                jpeg_bytes(size=(2400, 1800), with_metadata=True),
                "image/jpeg",
            )
        },
        data={"portion_context": "large serving"},
    )
    assert response.status_code == 200
    assert response.json()["nutritional_info"]["protein"] == 55
    assert client.get("/api/meal-logs/").json() == []


@pytest.mark.parametrize(
    ("provider_error", "expected_status"),
    [
        (LensAIUnavailableError("not configured"), 503),
        (LensAIUpstreamError("provider unavailable"), 502),
        (LensAITimeoutError("provider timed out"), 504),
    ],
)
def test_photo_analysis_maps_provider_errors(client, monkeypatch, provider_error, expected_status):
    def fail(*_args, **_kwargs):
        raise provider_error

    monkeypatch.setattr(meal_logs, "analyze_meal_image", fail)
    response = client.post(
        "/api/meal-logs/analyze",
        files={"photo": ("meal.jpg", jpeg_bytes(), "image/jpeg")},
    )
    assert response.status_code == expected_status


def test_meal_service_uses_configured_structured_response_without_storage(monkeypatch):
    captured = {}
    draft = MealAnalysisDraft(
        title="Chicken and rice",
        foods=[FoodComponent(name="Chicken", portion="200g")],
        nutritional_info=NutritionEstimate(calories=650, protein=55, carbs=70, fat=14),
        assumptions=["Oil is estimated"],
    )

    class FakeResponses:
        def parse(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(output_parsed=draft)

    fake_client = SimpleNamespace(responses=FakeResponses())
    monkeypatch.setattr(openai_lens_service, "_client", lambda: fake_client)
    result = openai_lens_service.analyze_meal_image(jpeg_bytes(), "large serving")

    assert result == draft
    assert captured["model"] == openai_lens_service.settings.OPENAI_MEAL_ANALYSIS_MODEL
    assert captured["text_format"] is MealAnalysisDraft
    assert captured["store"] is False
    image_part = captured["input"][1]["content"][1]
    assert image_part["image_url"].startswith("data:image/jpeg;base64,")


def test_today_meal_suggestion_uses_profile_and_remaining_targets(client, monkeypatch):
    captured = {}

    def fake_suggest(
        meal_type,
        available_time,
        restrictions,
        preferences,
        remaining_calories,
        remaining_protein,
    ):
        captured.update(
            meal_type=meal_type,
            available_time=available_time,
            restrictions=restrictions,
            preferences=preferences,
            remaining_calories=remaining_calories,
            remaining_protein=remaining_protein,
        )
        return generated_recipe(1)

    monkeypatch.setattr(meal_logs, "generate_meal_suggestion", fake_suggest)
    response = client.post(
        "/api/meal-logs/suggest",
        json={
            "meal_type": "dinner",
            "available_time_minutes": 30,
            "remaining_calories": 850,
            "remaining_protein": 65,
        },
    )

    assert response.status_code == 200
    assert response.json()["recipe"]["title"] == "Gym meal 1"
    assert captured == {
        "meal_type": "dinner",
        "available_time": 30,
        "restrictions": ["shellfish"],
        "preferences": {"theme": "dark"},
        "remaining_calories": 850,
        "remaining_protein": 65,
    }


def test_today_meal_suggestion_maps_provider_errors(client, monkeypatch):
    def fail(*_args, **_kwargs):
        raise LensAIUnavailableError("not configured")

    monkeypatch.setattr(meal_logs, "generate_meal_suggestion", fail)
    response = client.post(
        "/api/meal-logs/suggest",
        json={"meal_type": "lunch", "available_time_minutes": 20},
    )
    assert response.status_code == 503


def test_suggestion_service_returns_one_structured_recipe(monkeypatch):
    captured = {}

    class FakeResponses:
        def parse(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                output_parsed=MealSuggestionResponse(recipe=generated_recipe(1))
            )

    monkeypatch.setattr(
        openai_lens_service,
        "_client",
        lambda: SimpleNamespace(responses=FakeResponses()),
    )
    recipe = openai_lens_service.generate_meal_suggestion(
        "lunch",
        30,
        ["vegetarian"],
        {
            "fitness_goal": "cut",
            "preferred_cuisines": ["Thai"],
            "disliked_ingredients": ["Olives"],
            "max_prep_time_minutes": 20,
        },
        700,
        50,
    )

    assert recipe.title == "Gym meal 1"
    assert captured["model"] == openai_lens_service.settings.OPENAI_RECIPE_MODEL
    assert captured["text_format"] is MealSuggestionResponse
    assert captured["store"] is False
    prompt = captured["input"][1]["content"]
    assert "one complete lunch" in prompt
    assert "within 20 minutes" in prompt
    assert "700 kcal" in prompt
    assert "50 g protein" in prompt


def test_pantry_generation_uses_user_context_and_returns_three(client, monkeypatch):
    client.post("/api/pantry/", json={"name": "Chicken"})
    captured = {}

    def fake_generate(names, goal, meal_type, restrictions, preferences):
        captured.update(
            names=names,
            goal=goal,
            meal_type=meal_type,
            restrictions=restrictions,
            preferences=preferences,
        )
        return [generated_recipe(index) for index in range(3)]

    monkeypatch.setattr(pantry, "generate_pantry_recipes", fake_generate)
    response = client.post(
        "/api/pantry/generate",
        json={"goal": "bulk", "meal_type": "dinner"},
    )
    assert response.status_code == 200
    assert len(response.json()["recipes"]) == 3
    assert captured == {
        "names": ["Chicken"],
        "goal": "bulk",
        "meal_type": "dinner",
        "restrictions": ["shellfish"],
        "preferences": {"theme": "dark"},
    }


def test_generation_works_without_grocery_ingredients(client, monkeypatch):
    captured = {}

    def fake_generate(names, goal, meal_type, restrictions, preferences):
        captured.update(
            names=names,
            goal=goal,
            meal_type=meal_type,
            restrictions=restrictions,
            preferences=preferences,
        )
        return [generated_recipe(index) for index in range(3)]

    monkeypatch.setattr(pantry, "generate_pantry_recipes", fake_generate)
    response = client.post(
        "/api/pantry/generate",
        json={"goal": "maintain", "meal_type": "lunch"},
    )

    assert response.status_code == 200
    assert len(response.json()["recipes"]) == 3
    assert captured["names"] == []


def test_recipe_service_includes_saved_meal_preferences(monkeypatch):
    captured = {}

    class FakeResponses:
        def parse(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(
                output_parsed={
                    "recipes": [
                        generated_recipe(index).model_dump()
                        for index in range(3)
                    ]
                }
            )

    monkeypatch.setattr(
        openai_lens_service,
        "_client",
        lambda: SimpleNamespace(responses=FakeResponses()),
    )
    recipes = openai_lens_service.generate_pantry_recipes(
        ["Chicken"],
        "cut",
        "lunch",
        ["gluten-free"],
        {
            "preferred_cuisines": ["Mexican"],
            "disliked_ingredients": ["Mushrooms"],
            "max_prep_time_minutes": 30,
        },
    )

    assert len(recipes) == 3
    assert captured["model"] == openai_lens_service.settings.OPENAI_RECIPE_MODEL
    assert captured["store"] is False
    prompt = captured["input"][1]["content"]
    assert "fitness goal is cut" in prompt
    assert "Preferred cuisines: [\"Mexican\"]" in prompt
    assert "Ingredients to avoid: [\"Mushrooms\"]" in prompt
    assert "within 30 minutes" in prompt


def test_recipe_schema_rejects_more_than_three_missing_ingredients():
    payload = generated_recipe(1).model_dump()
    payload["missing_ingredients"] = ["a", "b", "c", "d"]
    with pytest.raises(ValueError):
        GeneratedGymRecipe.model_validate(payload)
