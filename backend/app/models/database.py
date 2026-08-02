from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, Date, JSON, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime, timezone
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def utc_now():
    """Return an aware UTC timestamp for new Lens records."""
    return datetime.now(timezone.utc)


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="client")  # 'client' or 'coach'
    client_code = Column(String, unique=True, index=True)  # Unique code for coach linking
    dietary_restrictions = Column(JSON, default=list)
    preferences = Column(JSON, default=dict)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    family = relationship("Family", back_populates="members")
    meals = relationship("Meal", back_populates="user")
    grocery_items = relationship("GroceryItem", back_populates="user")
    meal_logs = relationship("MealLog", back_populates="user", cascade="all, delete-orphan")
    pantry_ingredients = relationship("PantryIngredient", back_populates="user", cascade="all, delete-orphan")


class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    members = relationship("User", back_populates="family")


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    instructions = Column(Text, nullable=False)
    prep_time = Column(Integer)
    cook_time = Column(Integer)
    servings = Column(Integer)
    difficulty = Column(String)
    image_url = Column(String)
    source_url = Column(String)
    tags = Column(JSON, default=list)
    ingredients = Column(JSON, default=list)
    nutritional_info = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    user = relationship("User")


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    meal_type = Column(String)  # breakfast, lunch, dinner, snack
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text)
    planned = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="meals")
    recipe = relationship("Recipe")


class GroceryItem(Base):
    __tablename__ = "grocery_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    quantity = Column(Float, default=1)
    unit = Column(String)
    category = Column(String)
    expiration_date = Column(Date)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="grocery_items")


class CoachClient(Base):
    """Association table linking coaches to their clients"""
    __tablename__ = "coach_clients"

    id = Column(Integer, primary_key=True, index=True)
    coach_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)  # Client has one coach
    created_at = Column(DateTime, default=datetime.utcnow)

    coach = relationship("User", foreign_keys=[coach_id])
    client = relationship("User", foreign_keys=[client_id])


class MealLog(Base):
    """A confirmed meal the user consumed; separate from the planned meal calendar."""

    __tablename__ = "meal_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    foods = Column(JSON, default=list, nullable=False)
    calories = Column(Float, default=0, nullable=False)
    protein = Column(Float, default=0, nullable=False)
    carbs = Column(Float, default=0, nullable=False)
    fat = Column(Float, default=0, nullable=False)
    eaten_at = Column(DateTime(timezone=True), nullable=False, index=True)
    notes = Column(Text)
    favorite = Column(Boolean, default=False, nullable=False, index=True)
    source_recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="meal_logs")
    source_recipe = relationship("Recipe")


class PantryIngredient(Base):
    """A deliberately lightweight list of ingredients currently available."""

    __tablename__ = "pantry_ingredients"
    __table_args__ = (
        UniqueConstraint("user_id", "normalized_name", name="uq_pantry_user_ingredient"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    normalized_name = Column(String(120), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="pantry_ingredients")
