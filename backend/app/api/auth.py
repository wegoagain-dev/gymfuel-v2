from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
import secrets

from app.models.database import get_db, User
from app.schemas.schemas import (
    MealPreferencesResponse,
    MealPreferencesUpdate,
    NutritionTargetsResponse,
    NutritionTargetsUpdate,
    Token,
    UserCreate,
    UserResponse,
)
from app.core.config import settings

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def generate_client_code() -> str:
    """Generate a unique 16-character client code."""
    return secrets.token_hex(8).upper()  # 16 hex chars = 64 bits entropy


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    # Bcrypt has a 72 byte limit
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Email comparison is case-insensitive (stored as lowercase)
    user = db.query(User).filter(User.email == email.lower()).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/register/", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Normalise email to lowercase for case-insensitive comparison
    normalised_email = user.email.lower()
    
    db_user = db.query(User).filter(User.email == normalised_email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="An account with this email may already exist. Try logging in instead.")
    
    # Generate a unique client code
    client_code = generate_client_code()
    while db.query(User).filter(User.client_code == client_code).first():
        client_code = generate_client_code()  # Regenerate if collision
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=normalised_email,  # Store as lowercase
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        client_code=client_code,
        hashed_password=hashed_password,
        dietary_restrictions=user.dietary_restrictions,
        preferences=user.preferences
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/login/", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Normalise email to lowercase for case-insensitive comparison
    normalised_email = form_data.username.lower()
    
    user = db.query(User).filter(User.email == normalised_email).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me/", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/nutrition-targets", response_model=NutritionTargetsResponse)
async def update_nutrition_targets(
    targets: NutritionTargetsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    preferences = dict(current_user.preferences or {})
    preferences.update(targets.model_dump())
    current_user.preferences = preferences
    db.commit()
    db.refresh(current_user)
    return NutritionTargetsResponse(**targets.model_dump())


@router.patch("/me/meal-preferences", response_model=MealPreferencesResponse)
async def update_meal_preferences(
    meal_preferences: MealPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.dietary_restrictions = meal_preferences.dietary_restrictions
    preferences = dict(current_user.preferences or {})
    preferences.update(
        meal_preferences.model_dump(exclude={"dietary_restrictions"})
    )
    current_user.preferences = preferences
    db.commit()
    db.refresh(current_user)
    return MealPreferencesResponse(**meal_preferences.model_dump())
