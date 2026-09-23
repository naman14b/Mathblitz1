"""FastAPI Router for MathBlitz Kingdom Journey."""
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from .service import get_or_create_journey_progress, submit_journey_level_result

router = APIRouter(prefix="/api/journey", tags=["journey"])


class LevelSubmissionRequest(BaseModel):
    submission_id: str
    player_id: str
    level_id: int
    world_id: str = "number_forest"
    score: int = 0
    stars: int = Field(default=0, ge=0, le=3)
    correct_count: int = 0
    total_count: int = 0
    time_taken_seconds: int = 0
    accuracy: float = 0.0


@router.get("/progress/{player_id}")
async def get_player_journey_progress_endpoint(
    player_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieves authoritative Kingdom Journey state for the player."""
    progress = await get_or_create_journey_progress(db, player_id)
    return {
        "player_id": progress.player_id,
        "highest_unlocked_level": progress.highest_unlocked_level,
        "total_stars": progress.total_stars,
        "completed_levels": progress.completed_levels,
        "stars_by_level": progress.stars_by_level,
        "best_scores_by_level": progress.best_scores_by_level,
        "best_times_by_level": progress.best_times_by_level,
        "unlocked_worlds": progress.unlocked_worlds,
        "daily_journey": {
            "date": progress.daily_journey_date,
            "completed_levels": progress.daily_journey_completed_levels,
            "current_streak": progress.daily_streak,
            "longest_streak": progress.longest_streak,
        },
        "weekly_journey": {
            "start_date": progress.weekly_start_date,
            "completed_count": progress.weekly_completed_count,
        }
    }


@router.post("/submit-level")
async def submit_journey_level_endpoint(
    req: LevelSubmissionRequest,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Submits a completed level result for authoritative evaluation."""
    res = await submit_journey_level_result(db, req.model_dump())
    return res
