import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-" + ("x" * 48))

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.auth import get_current_user
from app.main import app
from app.models.database import Base, User, get_db


test_engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
active_user = {"id": 1}


def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


def override_current_user(db: Session = Depends(get_db)):
    return db.get(User, active_user["id"])


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_current_user


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    with TestingSession() as db:
        db.add_all(
            [
                User(
                    id=1,
                    email="client@example.com",
                    username="client",
                    hashed_password="unused",
                    role="client",
                    dietary_restrictions=["shellfish"],
                    preferences={"theme": "dark"},
                ),
                User(
                    id=2,
                    email="other@example.com",
                    username="other",
                    hashed_password="unused",
                    role="client",
                    dietary_restrictions=[],
                    preferences={},
                ),
            ]
        )
        db.commit()
    active_user["id"] = 1
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def switch_user():
    def switch(user_id: int):
        active_user["id"] = user_id

    return switch
