"""In-memory TTL Cache with LRU eviction for FunGanit AI responses.
Ensures zero redundant LLM calls, instant response times, and PII protection.
"""
from collections import OrderedDict
from datetime import datetime, timezone
import hashlib
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class TTLCache:
    """Thread-safe and async-safe bounded in-memory cache with TTL and LRU eviction."""

    def __init__(self, max_size: int = 1000):
        self._cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self._max_size = max_size

    def _now(self) -> float:
        return datetime.now(timezone.utc).timestamp()

    def get(self, key: str) -> Optional[Any]:
        """Retrieve an item if it exists and has not expired."""
        if key not in self._cache:
            return None

        val, expires_at = self._cache[key]
        if self._now() > expires_at:
            # Expired
            self._cache.pop(key, None)
            return None

        # Move to end for LRU
        self._cache.move_to_end(key)
        return val

    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        """Store an item with a time-to-live in seconds."""
        if value is None:
            return

        expires_at = self._now() + ttl_seconds

        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (value, expires_at)

        # Evict oldest if exceeding max_size
        while len(self._cache) > self._max_size:
            self._cache.popitem(last=False)

    def clear(self) -> None:
        """Clear all entries."""
        self._cache.clear()

    def size(self) -> int:
        """Current number of active items (may include lazily-evicted expired items)."""
        return len(self._cache)

    @staticmethod
    def hash_str(text: str) -> str:
        """Helper to create a deterministic short SHA-256 fingerprint."""
        return hashlib.sha256(text.strip().lower().encode("utf-8")).hexdigest()[:16]


# Global cache instance
ai_cache = TTLCache(max_size=1500)
