"""Unit and API Tests for Google Play In-App Billing verification endpoint."""
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from backend.db import get_db
from backend.models import GooglePlayPurchase
from backend.server import app


class InMemoryBillingDB:
    def __init__(self):
        self.purchases = {}  # purchase_token -> GooglePlayPurchase

    async def execute(self, stmt):
        stmt_str = str(stmt)
        result_mock = MagicMock()
        if "FROM google_play_purchases" in stmt_str:
            token = None
            for param in stmt.compile().params.values():
                if isinstance(param, str) and param in self.purchases:
                    token = param
                    break
                elif isinstance(param, str):
                    token = param
            purchase = self.purchases.get(token)
            result_mock.scalar_one_or_none.return_value = purchase
            return result_mock
        result_mock.scalar_one_or_none.return_value = None
        return result_mock


@pytest.fixture
def mock_billing_db():
    return InMemoryBillingDB()


@pytest.fixture
def billing_client(mock_billing_db):
    async def override_get_db():
        yield mock_billing_db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_verify_requires_valid_token(billing_client):
    payload = {
        "player_id": "test_player_1",
        "product_id": "com.naman.mathblitz.theme_cosmic",
        "purchase_token": "   ",
        "package_name": "com.naman.mathblitz"
    }
    res = billing_client.post("/api/billing/google-play/verify", json=payload)
    assert res.status_code == 400
    assert "Invalid purchase_token" in res.json()["detail"]


def test_verify_inactive_unconfigured_release(billing_client):
    payload = {
        "player_id": "player_abc",
        "product_id": "com.naman.mathblitz.theme_cosmic",
        "purchase_token": "token_12345_unique",
        "package_name": "com.naman.mathblitz"
    }
    res = billing_client.post("/api/billing/google-play/verify", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is False
    assert data["status"] == "not_configured"
    assert data["product_id"] == "com.naman.mathblitz.theme_cosmic"
    assert data["player_id"] == "player_abc"
    assert "inactive for this release" in data["detail"]


def test_verify_existing_token_idempotent(mock_billing_db, billing_client):
    # Seed an already processed purchase
    existing = GooglePlayPurchase(
        id=1,
        purchase_token="token_already_verified",
        player_id="player_vip",
        product_id="com.naman.mathblitz.theme_cosmic",
        purchase_state="verified",
        acknowledged=True
    )
    mock_billing_db.purchases["token_already_verified"] = existing

    payload = {
        "player_id": "player_vip",
        "product_id": "com.naman.mathblitz.theme_cosmic",
        "purchase_token": "token_already_verified",
        "package_name": "com.naman.mathblitz"
    }
    res = billing_client.post("/api/billing/google-play/verify", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is True
    assert data["status"] == "verified"
    assert "already recorded" in data["detail"]
