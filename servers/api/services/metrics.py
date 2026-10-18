"""Prometheus Metrics Collection for CivicFlow.

Collects and exposes metrics for:
- Request latency and throughput
- Classification accuracy and confidence
- Cache hit/miss rates
- Database query performance
- Kafka consumer lag
- Circuit breaker states
"""

from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Any, Generator

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    REGISTRY,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

logger = logging.getLogger("civicflow.metrics")

# ── HTTP Request Metrics ──

REQUEST_COUNT = Counter(
    "civicflow_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "civicflow_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

REQUESTS_IN_PROGRESS = Gauge(
    "civicflow_http_requests_in_progress",
    "Number of HTTP requests currently being processed",
    ["method", "endpoint"],
)

# ── Classification Metrics ──

CLASSIFICATION_TOTAL = Counter(
    "civicflow_classification_total",
    "Total classifications performed",
    ["department", "authority", "channel"],
)

CLASSIFICATION_LATENCY = Histogram(
    "civicflow_classification_duration_seconds",
    "Classification latency in seconds",
    ["channel"],
    buckets=(0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0),
)

CLASSIFICATION_CONFIDENCE = Histogram(
    "civicflow_classification_confidence",
    "Classification confidence scores",
    ["department"],
    buckets=(0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0),
)

CLASSIFICATION_FALLBACK = Counter(
    "civicflow_classification_fallback_total",
    "Times classification fell back to rule-based",
    ["reason"],
)

# ── Cache Metrics ──

CACHE_HITS = Counter(
    "civicflow_cache_hits_total",
    "Total cache hits",
    ["cache_type"],
)

CACHE_MISSES = Counter(
    "civicflow_cache_misses_total",
    "Total cache misses",
    ["cache_type"],
)

CACHE_OPERATIONS = Counter(
    "civicflow_cache_operations_total",
    "Total cache operations",
    ["operation", "status"],
)

CACHE_SIZE = Gauge(
    "civicflow_cache_size_bytes",
    "Current cache size in bytes",
    ["cache_type"],
)

# ── Database Metrics ──

DB_QUERIES = Counter(
    "civicflow_db_queries_total",
    "Total database queries",
    ["query_type", "table"],
)

DB_QUERY_LATENCY = Histogram(
    "civicflow_db_query_duration_seconds",
    "Database query latency in seconds",
    ["query_type", "table"],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0),
)

DB_CONNECTIONS = Gauge(
    "civicflow_db_connections",
    "Active database connections",
    ["state"],
)

# ── Kafka Metrics ──

KAFKA_MESSAGES_PRODUCED = Counter(
    "civicflow_kafka_messages_produced_total",
    "Total Kafka messages produced",
    ["topic"],
)

KAFKA_MESSAGES_CONSUMED = Counter(
    "civicflow_kafka_messages_consumed_total",
    "Total Kafka messages consumed",
    ["topic", "consumer_group"],
)

KAFKA_CONSUMER_LAG = Gauge(
    "civicflow_kafka_consumer_lag",
    "Kafka consumer lag (messages behind)",
    ["topic", "consumer_group", "partition"],
)

KAFKA_PROCESSING_LATENCY = Histogram(
    "civicflow_kafka_processing_duration_seconds",
    "Time to process a Kafka message",
    ["topic"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# ── Circuit Breaker Metrics ──

CIRCUIT_BREAKER_STATE = Gauge(
    "civicflow_circuit_breaker_state",
    "Circuit breaker state (0=closed, 1=open, 2=half_open)",
    ["name"],
)

CIRCUIT_BREAKER_FAILURES = Counter(
    "civicflow_circuit_breaker_failures_total",
    "Total circuit breaker failures",
    ["name"],
)

# ── Business Metrics ──

TICKETS_CREATED = Counter(
    "civicflow_tickets_created_total",
    "Total tickets created",
    ["department", "authority", "urgency"],
)

TICKETS_RESOLVED = Counter(
    "civicflow_tickets_resolved_total",
    "Total tickets resolved",
    ["department", "authority"],
)

TICKETS_BY_STATUS = Gauge(
    "civicflow_tickets_by_status",
    "Current number of tickets by status",
    ["status"],
)

# ── PII Detection Metrics ──

PII_DETECTED = Counter(
    "civicflow_pii_detected_total",
    "Total PII instances detected",
    ["pii_type"],
)

PII_ENCRYPTED = Counter(
    "civicflow_pii_encrypted_total",
    "Total PII fields encrypted",
)


# ── Helper Functions ──


def record_http_request(
    method: str,
    endpoint: str,
    status_code: int,
    duration: float,
) -> None:
    """Record HTTP request metrics."""
    REQUEST_COUNT.labels(
        method=method,
        endpoint=endpoint,
        status_code=str(status_code),
    ).inc()
    REQUEST_LATENCY.labels(
        method=method,
        endpoint=endpoint,
    ).observe(duration)


def record_classification(
    department: str,
    authority: str,
    channel: str,
    duration: float,
    confidence: float | None = None,
) -> None:
    """Record classification metrics."""
    CLASSIFICATION_TOTAL.labels(
        department=department,
        authority=authority,
        channel=channel,
    ).inc()
    CLASSIFICATION_LATENCY.labels(channel=channel).observe(duration)
    if confidence is not None:
        CLASSIFICATION_CONFIDENCE.labels(department=department).observe(confidence)


def record_cache_hit(cache_type: str) -> None:
    """Record a cache hit."""
    CACHE_HITS.labels(cache_type=cache_type).inc()


def record_cache_miss(cache_type: str) -> None:
    """Record a cache miss."""
    CACHE_MISSES.labels(cache_type=cache_type).inc()


def record_db_query(query_type: str, table: str, duration: float) -> None:
    """Record database query metrics."""
    DB_QUERIES.labels(query_type=query_type, table=table).inc()
    DB_QUERY_LATENCY.labels(query_type=query_type, table=table).observe(duration)


def record_kafka_message_produced(topic: str) -> None:
    """Record a Kafka message produced."""
    KAFKA_MESSAGES_PRODUCED.labels(topic=topic).inc()


def record_kafka_message_consumed(topic: str, consumer_group: str, duration: float) -> None:
    """Record a Kafka message consumed."""
    KAFKA_MESSAGES_CONSUMED.labels(
        topic=topic,
        consumer_group=consumer_group,
    ).inc()
    KAFKA_PROCESSING_LATENCY.labels(topic=topic).observe(duration)


def record_ticket_created(department: str, authority: str, urgency: int) -> None:
    """Record a ticket creation."""
    TICKETS_CREATED.labels(
        department=department,
        authority=authority,
        urgency=str(urgency),
    ).inc()


def record_pii_detected(pii_type: str, count: int = 1) -> None:
    """Record PII detection."""
    PII_DETECTED.labels(pii_type=pii_type).inc(count)


@contextmanager
def time_db_query(query_type: str, table: str) -> Generator[None, None, None]:
    """Context manager to time a database query."""
    start = time.perf_counter()
    try:
        yield
    finally:
        duration = time.perf_counter() - start
        record_db_query(query_type, table, duration)


@contextmanager
def time_classification(channel: str) -> Generator[None, None, None]:
    """Context manager to time a classification."""
    start = time.perf_counter()
    try:
        yield
    finally:
        duration = time.perf_counter() - start
        CLASSIFICATION_LATENCY.labels(channel=channel).observe(duration)


def get_metrics() -> bytes:
    """Get Prometheus metrics in text format."""
    return generate_latest(REGISTRY)


def get_metrics_content_type() -> str:
    """Get the content type for Prometheus metrics."""
    return CONTENT_TYPE_LATEST


def update_circuit_breaker_metrics(name: str, state: str, failures: int) -> None:
    """Update circuit breaker metrics.

    Args:
        name: Circuit breaker name.
        state: Current state (closed, open, half_open).
        failures: Failure count.
    """
    state_value = {"closed": 0, "open": 1, "half_open": 2}.get(state, 0)
    CIRCUIT_BREAKER_STATE.labels(name=name).set(state_value)
    if failures > 0:
        CIRCUIT_BREAKER_FAILURES.labels(name=name).inc(failures)


# ── Health Check Helper ──


def get_metrics_summary() -> dict[str, Any]:
    """Get a summary of current metrics for health checks.

    Returns:
        Dict with key metric values.
    """
    # This is a simplified summary - in production you'd want to
    # track these values properly and return actual counts
    return {
        "http_requests_total": "see /metrics for details",
        "classification_count": "see /metrics for details",
        "cache_hit_rate": "see /metrics for details",
    }
