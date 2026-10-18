"""Redis caching service for CivicFlow — connection pooling, caching decorators, and utilities."""

from __future__ import annotations

import functools
import hashlib
import json
import logging
from typing import Any, Callable, TypeVar

from redis.asyncio import ConnectionPool, Redis
from redis.exceptions import RedisError

from api.config import settings
from api.middleware.tracing import trace_operation

logger = logging.getLogger("civicflow.cache")

# ── Type variables for decorators ──
F = TypeVar("F", bound=Callable[..., Any])
T = TypeVar("T")

# ── Global connection pool ──
_pool: ConnectionPool | None = None
_client: Redis | None = None


async def get_redis_client() -> Redis:
    """Get or create the Redis client (async, connection-pooled).

    Returns:
        Redis client instance.

    Raises:
        RedisError: If connection cannot be established.
    """
    global _client, _pool

    if _client is not None:
        return _client

    try:
        with trace_operation("redis_connect", url=settings.redis_url):
            _pool = ConnectionPool.from_url(
                settings.redis_url,
                decode_responses=True,
                max_connections=20,
                retry_on_timeout=True,
            )
            _client = Redis(connection_pool=_pool)

            # Test connection
            await _client.ping()
            logger.info("Redis connection established: %s", settings.redis_url)
            return _client

    except RedisError as exc:
        logger.error("Failed to connect to Redis: %s", exc)
        raise


async def close_redis_client() -> None:
    """Close the Redis client and connection pool gracefully."""
    global _client, _pool

    if _client is not None:
        await _client.aclose()
        _client = None
        logger.info("Redis client closed")

    if _pool is not None:
        await _pool.aclose()
        _pool = None
        logger.info("Redis connection pool closed")


def _generate_cache_key(*args: Any, **kwargs: Any) -> str:
    """Generate a stable cache key from function arguments.

    Args:
        *args: Positional arguments.
        **kwargs: Keyword arguments.

    Returns:
        SHA-256 hash of the serialized arguments.
    """
    # Combine args and kwargs into a single dict for stable serialization
    key_data = {"args": args, "kwargs": kwargs}
    serialized = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()


def cache_result(
    key_prefix: str,
    ttl: int | None = None,
    skip_cache: Callable[..., bool] | None = None,
) -> Callable[[F], F]:
    """Decorator to cache function results in Redis.

    Args:
        key_prefix: Prefix for the cache key (e.g., "embedding", "classification").
        ttl: Time-to-live in seconds. Defaults to settings.redis_cache_ttl.
        skip_cache: Optional function that returns True if caching should be skipped.

    Returns:
        Decorated function.

    Example:
        @cache_result("embedding", ttl=7200)
        async def generate_embedding(text: str) -> list[float]:
            ...
    """
    if ttl is None:
        ttl = settings.redis_cache_ttl

    def decorator(func: F) -> F:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Skip caching if disabled or skip_cache returns True
            if not settings.redis_enabled:
                return await func(*args, **kwargs)

            if skip_cache is not None and skip_cache(*args, **kwargs):
                return await func(*args, **kwargs)

            # Generate cache key
            cache_key = f"{key_prefix}:{_generate_cache_key(*args, **kwargs)}"

            try:
                client = await get_redis_client()

                # Try to get from cache with tracing
                with trace_operation("cache_get", key=cache_key):
                    cached = await client.get(cache_key)

                if cached is not None:
                    logger.debug("Cache HIT: %s", cache_key)
                    return json.loads(cached)

                logger.debug("Cache MISS: %s", cache_key)

                # Call the function
                result = await func(*args, **kwargs)

                # Store in cache with tracing
                with trace_operation("cache_set", key=cache_key, ttl=ttl):
                    await client.setex(
                        cache_key,
                        ttl,
                        json.dumps(result, default=str),
                    )
                logger.debug("Cache SET: %s (ttl=%ds)", cache_key, ttl)

                return result

            except RedisError as exc:
                logger.warning("Redis error in cache decorator: %s — falling back to direct call", exc)
                return await func(*args, **kwargs)

        return wrapper  # type: ignore

    return decorator


async def cache_get(key: str) -> Any | None:
    """Get a value from cache by key.

    Args:
        key: Cache key.

    Returns:
        Cached value (deserialized from JSON) or None if not found.
    """
    if not settings.redis_enabled:
        return None

    try:
        client = await get_redis_client()
        cached = await client.get(key)
        if cached is not None:
            return json.loads(cached)
        return None
    except RedisError as exc:
        logger.warning("Redis GET failed for key '%s': %s", key, exc)
        return None


async def cache_set(key: str, value: Any, ttl: int | None = None) -> bool:
    """Set a value in cache.

    Args:
        key: Cache key.
        value: Value to cache (will be JSON-serialized).
        ttl: Time-to-live in seconds. Defaults to settings.redis_cache_ttl.

    Returns:
        True if successful, False otherwise.
    """
    if not settings.redis_enabled:
        return False

    if ttl is None:
        ttl = settings.redis_cache_ttl

    try:
        client = await get_redis_client()
        await client.setex(key, ttl, json.dumps(value, default=str))
        logger.debug("Cache SET: %s (ttl=%ds)", key, ttl)
        return True
    except RedisError as exc:
        logger.warning("Redis SET failed for key '%s': %s", key, exc)
        return False


async def cache_delete(key: str) -> bool:
    """Delete a key from cache.

    Args:
        key: Cache key to delete.

    Returns:
        True if key was deleted, False otherwise.
    """
    if not settings.redis_enabled:
        return False

    try:
        client = await get_redis_client()
        deleted = await client.delete(key)
        return deleted > 0
    except RedisError as exc:
        logger.warning("Redis DELETE failed for key '%s': %s", key, exc)
        return False


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a pattern.

    Args:
        pattern: Glob-style pattern (e.g., "ticket:*" or "embedding:*").

    Returns:
        Number of keys deleted.
    """
    if not settings.redis_enabled:
        return 0

    try:
        client = await get_redis_client()
        keys = []
        async for key in client.scan_iter(match=pattern):
            keys.append(key)

        if not keys:
            return 0

        deleted = await client.delete(*keys)
        logger.info("Deleted %d keys matching pattern: %s", deleted, pattern)
        return deleted
    except RedisError as exc:
        logger.warning("Redis DELETE pattern failed for '%s': %s", pattern, exc)
        return 0


async def cache_exists(key: str) -> bool:
    """Check if a key exists in cache.

    Args:
        key: Cache key to check.

    Returns:
        True if key exists, False otherwise.
    """
    if not settings.redis_enabled:
        return False

    try:
        client = await get_redis_client()
        return await client.exists(key) > 0
    except RedisError:
        return False


async def cache_get_ttl(key: str) -> int:
    """Get the remaining TTL of a key.

    Args:
        key: Cache key.

    Returns:
        Remaining TTL in seconds, or -1 if no TTL, -2 if key doesn't exist.
    """
    if not settings.redis_enabled:
        return -2

    try:
        client = await get_redis_client()
        return await client.ttl(key)
    except RedisError:
        return -2


# ── Rate Limiting ──


async def rate_limit_check(
    identifier: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int, int]:
    """Check if an identifier has exceeded the rate limit.

    Uses a sliding window algorithm.

    Args:
        identifier: Unique identifier (e.g., IP address, user ID).
        max_requests: Maximum allowed requests in the window.
        window_seconds: Time window in seconds.

    Returns:
        Tuple of (allowed, current_count, reset_in_seconds).
        - allowed: True if request is allowed, False if rate limited.
        - current_count: Current number of requests in the window.
        - reset_in_seconds: Seconds until the oldest request expires.
    """
    if not settings.redis_enabled:
        return True, 0, 0

    try:
        client = await get_redis_client()
        key = f"ratelimit:{identifier}"

        # Use Redis pipeline for atomic operations
        async with client.pipeline() as pipe:
            now = int(asyncio.get_event_loop().time())  # type: ignore

            # Remove expired entries
            pipe.zremrangebyscore(key, 0, now - window_seconds)

            # Count current entries
            pipe.zcard(key)

            # Execute pipeline
            results = await pipe.execute()
            current_count = results[1]

            if current_count >= max_requests:
                # Rate limited — get time until oldest entry expires
                oldest = await client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    oldest_time = int(oldest[0][1])
                    reset_in = oldest_time + window_seconds - now
                else:
                    reset_in = window_seconds

                return False, current_count, max(0, reset_in)

            # Add current request
            await client.zadd(key, {f"{now}:{asyncio.get_event_loop().time()}": now})
            await client.expire(key, window_seconds)

            return True, current_count + 1, window_seconds

    except RedisError as exc:
        logger.warning("Rate limit check failed: %s — allowing request", exc)
        return True, 0, 0


# ── Import asyncio for timestamp ──
import asyncio
