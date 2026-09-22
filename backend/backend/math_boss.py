"""Math Boss — question generation, difficulty scaling, and personality.

The Math Boss is a surprise rapid-fire encounter that appears every 10 wins.
Each subsequent boss is harder than the last.
"""
import random
import secrets
from typing import List, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class BossQuestion(BaseModel):
    id: str
    prompt: str
    answer: int
    options: List[str]
    operation: str  # "+", "-", "×", "÷"


class BossChallenge(BaseModel):
    level: int
    boss_name: str
    boss_emoji: str
    taunt: str
    questions: List[BossQuestion]
    time_limit_seconds: int  # always 120


class BossResult(BaseModel):
    level: int
    correct: int
    total: int
    won: bool
    boss_message: str
    token_change: int  # +10 or -10


# ---------------------------------------------------------------------------
# Boss Personalities
# ---------------------------------------------------------------------------
BOSS_PROFILES = [
    {"name": "Count Calculo", "emoji": "🤖", "min_level": 1},
    {"name": "The Divisor", "emoji": "👹", "min_level": 2},
    {"name": "Professor Primus", "emoji": "🧙‍♂️", "min_level": 3},
    {"name": "Mathemagician X", "emoji": "🎩", "min_level": 4},
    {"name": "Dr. Infinity", "emoji": "💀", "min_level": 5},
]

TAUNTS = {
    1: [
        "Oh look, a tiny mathematician! Think you can handle 20 questions in 2 minutes? I doubt it.",
        "Welcome, human! I've been waiting. Let's see if your brain is faster than my calculator.",
        "So you've won {wins} games? Cute. Now face a REAL challenge!",
        "Ha! You think you're good at maths? I eat numbers for breakfast!",
        "Surprise! Your winning streak has caught my attention. Prove you deserve those tokens!",
    ],
    2: [
        "Back for more? I've upgraded my questions since last time. Good luck — you'll need it!",
        "Oh, the little champion returns! Let's see if your luck holds against HARDER numbers.",
        "You beat my minion, but I'm the real deal. These numbers don't play nice!",
        "Impressed you survived round 1. Round 2 won't be so forgiving!",
        "Remember me? I've been studying your weaknesses. Prepare for pain!",
    ],
    3: [
        "Still here? Most humans run away by now. But fine, let's dance with BIG numbers!",
        "Level {level}? You're either brave or foolish. Let me guess — both!",
        "I've sharpened my questions to a razor's edge. Your tokens are MINE!",
        "The legends spoke of a human who could defeat me three times. Spoiler: they couldn't.",
        "Every operation, every number — all designed to crush your confidence!",
    ],
}

DEFEAT_MESSAGES = [
    "WHAT?! Impossible! You... you actually beat me! Fine, take your tokens. I'll be back STRONGER!",
    "No... NO! My beautiful questions! You demolished them! I'll have my revenge!",
    "Okay okay, you win THIS time. But mark my words — next time, NO MERCY!",
    "I can't believe it. A human outsmarted me. I need to recalibrate...",
    "*explodes in mathematical fury* Take your 10 tokens and GO!",
    "You... you monster! Those were my best questions! I'll be back with HARDER ones!",
]

WIN_MESSAGES = [
    "HAHAHA! Too slow! Your tokens are MINE now! Better luck next time, human!",
    "As expected! No human can defeat the mighty Math Boss! *eats 10 tokens*",
    "Pathetic! My grandmother calculates faster, and she's an abacus!",
    "That's right, hand over those tokens! Come back when you've actually studied!",
    "CRUSHED! Your math skills need serious work. I'll be waiting for round 2!",
    "Another victim! Your tokens taste delicious. Practice more and try again!",
]


# ---------------------------------------------------------------------------
# Difficulty scaling
# ---------------------------------------------------------------------------
def _number_range(level: int) -> tuple[int, int]:
    """Return (min_val, max_val) for operands based on boss level."""
    if level <= 1:
        return (2, 20)
    elif level == 2:
        return (5, 50)
    elif level == 3:
        return (10, 100)
    else:
        return (10, 150 + level * 25)


def _operations_for_level(level: int) -> list[str]:
    """Return available operations based on boss level."""
    if level <= 1:
        return ["+", "-"]
    elif level == 2:
        return ["+", "-", "×"]
    else:
        return ["+", "-", "×", "÷"]


def _generate_one_question(level: int, used_prompts: set[str]) -> BossQuestion:
    """Generate a single boss question with difficulty scaling."""
    lo, hi = _number_range(level)
    ops = _operations_for_level(level)

    for _ in range(50):  # retry to avoid duplicates
        op = random.choice(ops)

        if op == "+":
            a = random.randint(lo, hi)
            b = random.randint(lo, hi)
            answer = a + b
            prompt = f"{a} + {b} = ?"
        elif op == "-":
            a = random.randint(lo, hi)
            b = random.randint(lo, min(a, hi))  # ensure non-negative result
            answer = a - b
            prompt = f"{a} − {b} = ?"
        elif op == "×":
            a = random.randint(lo, min(hi, 30 + level * 5))
            b = random.randint(2, min(12 + level * 2, 20))
            answer = a * b
            prompt = f"{a} × {b} = ?"
        else:  # ÷
            b = random.randint(2, min(12 + level * 2, 20))
            answer = random.randint(lo, min(hi, 50 + level * 10))
            a = answer * b  # ensure clean division
            prompt = f"{a} ÷ {b} = ?"

        if prompt not in used_prompts:
            used_prompts.add(prompt)
            break

    # Generate 3 wrong options
    options_set = {answer}
    spread = max(5, hi // 3)
    while len(options_set) < 4:
        delta = random.randint(1, spread) * random.choice([-1, 1])
        wrong = answer + delta
        if wrong >= 0:
            options_set.add(wrong)

    options = list(options_set)
    random.shuffle(options)

    return BossQuestion(
        id=secrets.token_hex(6),
        prompt=prompt,
        answer=answer,
        options=[str(o) for o in options],
        operation=op,
    )


def generate_boss_questions(level: int, count: int = 20) -> list[BossQuestion]:
    """Generate `count` questions at the given boss level."""
    used: set[str] = set()
    return [_generate_one_question(level, used) for _ in range(count)]


# ---------------------------------------------------------------------------
# Boss personality
# ---------------------------------------------------------------------------
def get_boss_profile(level: int) -> dict:
    """Return the boss name & emoji for the given level."""
    idx = min(level - 1, len(BOSS_PROFILES) - 1)
    return BOSS_PROFILES[max(0, idx)]


def generate_boss_taunt(level: int, player_name: str = "Player", wins: int = 10) -> str:
    """Return a sarcastic taunt for the boss entrance."""
    tier = min(level, 3)
    pool = TAUNTS.get(tier, TAUNTS[3])
    taunt = random.choice(pool)
    return taunt.format(wins=wins, level=level, name=player_name)


def generate_boss_defeat_message() -> str:
    """Boss's reaction when the player wins."""
    return random.choice(DEFEAT_MESSAGES)


def generate_boss_win_message() -> str:
    """Boss's gloating when the player loses."""
    return random.choice(WIN_MESSAGES)


# ---------------------------------------------------------------------------
# High-level challenge builder
# ---------------------------------------------------------------------------
def build_challenge(level: int, player_name: str = "Player", wins: int = 10) -> BossChallenge:
    """Build a complete boss challenge package."""
    boss = get_boss_profile(level)
    return BossChallenge(
        level=level,
        boss_name=boss["name"],
        boss_emoji=boss["emoji"],
        taunt=generate_boss_taunt(level, player_name, wins),
        questions=generate_boss_questions(level),
        time_limit_seconds=120,
    )


def build_result(level: int, correct: int, total: int = 20) -> BossResult:
    """Build a boss result with appropriate messaging."""
    won = correct >= (total // 2 + 1)  # need >50% to win (11/20)
    return BossResult(
        level=level,
        correct=correct,
        total=total,
        won=won,
        boss_message=generate_boss_defeat_message() if won else generate_boss_win_message(),
        token_change=10 if won else -10,
    )
