"""MathBlitz Kingdom - Journey Backend Service & Authoritative Progression Engine."""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import PlayerJourneyProgress, PlayerLevelResult


def utc_today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def utc_monday_str() -> str:
    now = datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return monday.strftime("%Y-%m-%d")


async def get_or_create_journey_progress(
    db: AsyncSession,
    player_id: str
) -> PlayerJourneyProgress:
    """Retrieves or initializes a player's journey progress record."""
    stmt = select(PlayerJourneyProgress).where(PlayerJourneyProgress.player_id == player_id)
    res = await db.execute(stmt)
    progress = res.scalar_one_or_none()

    today = utc_today_str()
    this_monday = utc_monday_str()

    if not progress:
        progress = PlayerJourneyProgress(
            player_id=player_id,
            highest_unlocked_level=1,
            total_stars=0,
            completed_levels={},
            stars_by_level={},
            best_scores_by_level={},
            best_times_by_level={},
            unlocked_worlds={"number_forest": True},
            daily_journey_date=today,
            daily_journey_completed_levels=[],
            daily_streak=0,
            longest_streak=0,
            last_qualifying_date=None,
            weekly_start_date=this_monday,
            weekly_completed_count=0,
        )
        db.add(progress)
        await db.commit()
        await db.refresh(progress)
        return progress

    # Handle daily streak date rollover
    if progress.daily_journey_date != today:
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        streak_kept = progress.last_qualifying_date == yesterday
        progress.daily_journey_date = today
        progress.daily_journey_completed_levels = []
        if not streak_kept:
            progress.daily_streak = 0
        await db.commit()

    # Handle weekly reset rollover
    if progress.weekly_start_date != this_monday:
        progress.weekly_start_date = this_monday
        progress.weekly_completed_count = 0
        await db.commit()

    return progress


async def submit_journey_level_result(
    db: AsyncSession,
    payload: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Authoritative, idempotent evaluation and persistence of level results.
    Prevents duplicate submissions and computes unlocks, stars, and streak rewards.
    """
    submission_id = payload["submission_id"]
    player_id = payload["player_id"]
    level_id = int(payload["level_id"])
    world_id = str(payload.get("world_id", "number_forest"))
    score = int(payload.get("score", 0))
    stars = int(payload.get("stars", 0))
    correct_count = int(payload.get("correct_count", 0))
    total_count = int(payload.get("total_count", 0))
    time_taken_seconds = int(payload.get("time_taken_seconds", 0))
    accuracy = float(payload.get("accuracy", 0.0))

    # 1. Check idempotency: Return immediately if already processed
    stmt_dup = select(PlayerLevelResult).where(PlayerLevelResult.submission_id == submission_id)
    dup_res = await db.execute(stmt_dup)
    existing_result = dup_res.scalar_one_or_none()
    if existing_result:
        progress = await get_or_create_journey_progress(db, player_id)
        return {
            "status": "already_processed",
            "submission_id": submission_id,
            "stars": existing_result.stars,
            "xp_delta": 0,
            "tokens_delta": 0,
            "highest_unlocked_level": progress.highest_unlocked_level,
            "total_stars": progress.total_stars,
        }

    # 2. Record individual attempt
    new_result = PlayerLevelResult(
        submission_id=submission_id,
        player_id=player_id,
        level_id=level_id,
        world_id=world_id,
        score=score,
        stars=stars,
        correct_count=correct_count,
        total_count=total_count,
        time_taken_seconds=time_taken_seconds,
        accuracy=accuracy,
    )
    db.add(new_result)

    # 3. Update authoritative progress
    progress = await get_or_create_journey_progress(db, player_id)
    completed_levels = dict(progress.completed_levels or {})
    stars_by_level = dict(progress.stars_by_level or {})
    best_scores = dict(progress.best_scores_by_level or {})
    best_times = dict(progress.best_times_by_level or {})
    unlocked_worlds = dict(progress.unlocked_worlds or {})

    is_completed = accuracy >= 0.75
    xp_delta = 0
    tokens_delta = 0
    unlocked_next_level = False
    unlocked_next_world = False

    if is_completed:
        is_first_clear = not completed_levels.get(str(level_id), False)
        completed_levels[str(level_id)] = True

        prev_stars = int(stars_by_level.get(str(level_id), 0))
        if stars > prev_stars:
            stars_by_level[str(level_id)] = stars
            tokens_delta += (stars - prev_stars) * 2

        if score > best_scores.get(str(level_id), 0):
            best_scores[str(level_id)] = score
        if str(level_id) not in best_times or time_taken_seconds < best_times[str(level_id)]:
            best_times[str(level_id)] = time_taken_seconds

        # Base clear reward
        if is_first_clear:
            xp_delta += 50 + level_id * 5
            tokens_delta += 5 if level_id % 20 != 0 else 50
        else:
            xp_delta += 20

        # Unlocking next level
        if level_id == progress.highest_unlocked_level:
            progress.highest_unlocked_level = level_id + 1
            unlocked_next_level = True

        # Boss victory unlocks next world
        if level_id % 20 == 0:
            next_world_num = (level_id // 20) + 1
            next_world_keys = ["number_forest", "fraction_valley", "percentage_city", "algebra_mountain", "geometry_castle"]
            if next_world_num <= len(next_world_keys):
                next_key = next_world_keys[next_world_num - 1]
                if not unlocked_worlds.get(next_key, False):
                    unlocked_worlds[next_key] = True
                    unlocked_next_world = True

        # Daily Journey quest tracking
        today = utc_today_str()
        daily_levels = list(progress.daily_journey_completed_levels or [])
        if level_id not in daily_levels:
            daily_levels.append(level_id)
            progress.daily_journey_completed_levels = daily_levels

            if len(daily_levels) == 3:
                progress.daily_streak += 1
                progress.longest_streak = max(progress.longest_streak, progress.daily_streak)
                progress.last_qualifying_date = today
                xp_delta += 100
                tokens_delta += 20

        # Weekly Journey tracking
        progress.weekly_completed_count = (progress.weekly_completed_count or 0) + 1
        if progress.weekly_completed_count == 20:
            xp_delta += 500
            tokens_delta += 100

        # Update persistent dicts
        progress.completed_levels = completed_levels
        progress.stars_by_level = stars_by_level
        progress.best_scores_by_level = best_scores
        progress.best_times_by_level = best_times
        progress.unlocked_worlds = unlocked_worlds
        progress.total_stars = sum(stars_by_level.values())

    await db.commit()
    await db.refresh(progress)

    return {
        "status": "success",
        "submission_id": submission_id,
        "completed": is_completed,
        "stars": stars,
        "xp_delta": xp_delta,
        "tokens_delta": tokens_delta,
        "unlocked_next_level": unlocked_next_level,
        "unlocked_next_world": unlocked_next_world,
        "highest_unlocked_level": progress.highest_unlocked_level,
        "total_stars": progress.total_stars,
        "daily_streak": progress.daily_streak,
        "daily_completed_count": len(progress.daily_journey_completed_levels or []),
        "weekly_completed_count": progress.weekly_completed_count,
    }
