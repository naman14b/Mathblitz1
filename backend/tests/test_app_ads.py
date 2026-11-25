import os
import pytest
from starlette.testclient import TestClient
from backend.server import app


@pytest.fixture
def client():
    return TestClient(app)


def test_app_ads_txt_status_and_content(client):
    response = client.get("/app-ads.txt")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    assert response.text.strip() == "google.com, pub-1850810324754301, DIRECT, f08c47fec0942fa0"


def test_app_ads_txt_trailing_slash(client):
    response = client.get("/app-ads.txt/")
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    assert response.text.strip() == "google.com, pub-1850810324754301, DIRECT, f08c47fec0942fa0"


def test_privacy_policy_preserved(client):
    response = client.get("/privacy-policy")
    assert response.status_code == 200
    assert "html" in response.headers.get("content-type", "")


def test_root_preserved(client):
    response = client.get("/")
    assert response.status_code == 200


def test_api_preserved(client):
    response = client.get("/api")
    assert response.status_code == 200
    data = response.json()
    assert "FunGanit API" in data.get("message", "")
