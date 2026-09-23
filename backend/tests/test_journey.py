"""Unit and API Integration Tests for MathBlitz Kingdom Journey."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from backend.db import get_db
from backend.models import PlayerJourneyProgress, PlayerLevelResult
from backend.server import app
from backend.journey.service import get_or_create_journey_progress, submit_journey_level_result


class InMemoryJourneyDB:
    """Mock in-memory store simulating AsyncSession for Journey models."""

    def __init__(self):
        self.journey_progress = {} # player_id -> PlayerJourneyProgress
        self.level_results = {}   # submission_id -> PlayerLevelResult

    async def execute(self, stmt):
        # We inspect what is being selected
        stmt_str = str(stmt)
        result_mock = MagicMock()

        if "FROM player_journey_progress" in stmt_str:
            # extract where clause or match player_id
            player_id = None
            for param in stmt.compile().params.values():
                if isinstance(param, str) and param in self.journey_progress:
                    player_id = param
                    break
                elif isinstance(param, str):
                    player_id = param
            prog = self.journey_progress.get(player_id)
            result_mock.scalar_one_or_none.return_value = prog
            return result_mock

        if "FROM player_level_results" in stmt_str:
            submission_id = None
            for param in stmt.compile().params.values():
                if isinstance(param, str) and param in self.level_results:
                    submission_id = param
                    break
                elif isinstance(param, str):
                    submission_id = param
            res = self.level_results.get(submission_id)
            result_mock.scalar_one_or_none.return_value = res
            return result_mock

        result_mock.scalar_one_or_none.return_value = None
        return result_mock

    def add(self, obj):
        if isinstance(obj, PlayerJourneyProgress):
            self.journey_progress[obj.player_id] = obj
        elif isinstance(obj, PlayerLevelResult):
            self.level_results[obj.submission_id] = obj

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


@pytest.fixture
def mock_db():
    return InMemoryJourneyDB()


@pytest.fixture
def test_client(mock_db):
    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_journey_service_initialization(mock_db):
    """Verify player journey progress is created with default state."""
    progress = await get_or_create_journey_progress(mock_db, "test_hero_1")
    assert progress.player_id == "test_hero_1"
    assert progress.highest_unlocked_level == 1
    assert progress.total_stars == 0
    assert progress.unlocked_worlds.get("number_forest") is True
    assert progress.daily_streak == 0


@pytest.mark.anyio
async def test_journey_service_progression_and_idempotency(mock_db):
    """Verify level submission, progression unlocking, and duplicate submission prevention."""
    payload = {
        "submission_id": "sub_test_101",
        "player_id": "test_hero_2",
        "level_id": 1,
        "world_id": "number_forest",
        "score": 350,
        "stars": 3,
        "correct_count": 4,
        "total_count": 4,
        "time_taken_seconds": 22,
        "accuracy": 1.0,
    }

    # 1. First submission
    res1 = await submit_journey_level_result(mock_db, payload)
    assert res1["status"] == "success"
    assert res1["completed"] is True
    assert res1["stars"] == 3
    assert res1["unlocked_next_level"] is True
    assert res1["highest_unlocked_level"] == 2
    assert res1["xp_delta"] > 0
    assert res1["tokens_delta"] > 0

    # 2. Duplicate submission with same submission_id (Idempotency check)
    res2 = await submit_journey_level_result(mock_db, payload)
    assert res2["status"] == "already_processed"
    assert res2["xp_delta"] == 0
    assert res2["tokens_delta"] == 0
    assert res2["highest_unlocked_level"] == 2


@pytest.mark.anyio
async def test_journey_boss_unlocks_next_world(mock_db):
    """Verify defeating level 20 boss unlocks World 2 (fraction_valley)."""
    progress = await get_or_create_journey_progress(mock_db, "test_hero_boss")
    progress.highest_unlocked_level = 20

    boss_payload = {
        "submission_id": "sub_boss_20",
        "player_id": "test_hero_boss",
        "level_id": 20,
        "world_id": "number_forest",
        "score": 800,
        "stars": 3,
        "correct_count": 7,
        "total_count": 7,
        "time_taken_seconds": 45,
        "accuracy": 1.0,
    }

    res = await submit_journey_level_result(mock_db, boss_payload)
    assert res["status"] == "success"
    assert res["unlocked_next_world"] is True
    assert res["highest_unlocked_level"] == 21

    refreshed = await get_or_create_journey_progress(mock_db, "test_hero_boss")
    assert refreshed.unlocked_worlds.get("fraction_valley") is True


@pytest.mark.anyio
async def test_daily_journey_streak_completion(mock_db):
    """Verify completing 3 levels in a day triggers daily goal and increments streak."""
    for lvl in [1, 2, 3]:
        payload = {
            "submission_id": f"sub_daily_{lvl}",
            "player_id": "test_hero_daily",
            "level_id": lvl,
            "world_id": "number_forest",
            "score": 300,
            "stars": 2,
            "correct_count": 4,
            "total_count": 5,
            "time_taken_seconds": 30,
            "accuracy": 0.8,
        }
        res = await submit_journey_level_result(mock_db, payload)

    assert res["daily_completed_count"] == 3
    assert res["daily_streak"] == 1
    assert res["tokens_delta"] >= 20  # Daily quest bonus


def test_journey_api_endpoints(test_client):
    """Test Journey FastAPI REST endpoints."""
    # 1. Get Progress
    res_get = test_client.get("/api/journey/progress/player_api_test")
    assert res_get.status_code == 200
    data = res_get.json()
    assert data["player_id"] == "player_api_test"
    assert data["highest_unlocked_level"] == 1
    assert "number_forest" in data["unlocked_worlds"]

    # 2. Submit Level
    sub_payload = {
        "submission_id": "api_sub_101",
        "player_id": "player_api_test",
        "level_id": 1,
        "world_id": "number_forest",
        "score": 400,
        "stars": 3,
        "correct_count": 4,
        "total_count": 4,
        "time_taken_seconds": 20,
        "accuracy": 1.0,
    }
    res_post = test_client.post("/api/journey/submit-level", json=sub_payload)
    assert res_post.status_code == 200
    post_data = res_post.json()
    assert post_data["status"] == "success"
    assert post_data["highest_unlocked_level"] == 2
    assert post_data["total_stars"] == 3
