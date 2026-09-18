import os
import uuid

import requests


BASE_URL = os.environ.get("EXPO_BACKEND_URL", "https://app-launch-stage-84.preview.emergentagent.com").rstrip("/")


def test_admin_api_crud_and_protection():
    assert requests.get(f"{BASE_URL}/api/").json() == {"message": "MathBlitz API"}
    assert requests.get(f"{BASE_URL}/api/admin/questions").status_code == 401
    bad = requests.post(f"{BASE_URL}/api/admin/login", json={"email": "bad@example.com", "password": "bad"})
    assert bad.status_code == 401
    login = requests.post(f"{BASE_URL}/api/admin/login", json={"email": "owner@mathblitz.app", "password": "MathBlitzAdmin!2026"})
    assert login.status_code == 200
    token = login.json()["token"]
    headers = {"X-Admin-Token": token}
    question_id = f"TEST_{uuid.uuid4().hex}"
    payload = {"id": question_id, "prompt": "TEST 2+2?", "options": ["3", "4", "5", "6"], "correct_answer": "4", "age_group": "6-7", "topic": "addition", "active": True}
    created = requests.post(f"{BASE_URL}/api/admin/questions", json=payload, headers=headers)
    assert created.status_code == 200 and "_id" not in created.json()
    listed = requests.get(f"{BASE_URL}/api/admin/questions", headers=headers)
    assert listed.status_code == 200 and any(item["id"] == question_id for item in listed.json())
    deleted = requests.delete(f"{BASE_URL}/api/admin/questions/{question_id}", headers=headers)
    assert deleted.status_code == 200 and deleted.json()["deleted"] is True
    challenge_id = f"TEST_{uuid.uuid4().hex}"
    challenge = {"id": challenge_id, "days": 3, "title": "TEST streak", "description": "TEST", "reward_xp": 50, "active": True}
    saved = requests.post(f"{BASE_URL}/api/admin/challenges", json=challenge, headers=headers)
    assert saved.status_code == 200 and "_id" not in saved.json()