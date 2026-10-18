"""Structured JSON Logging for CivicFlow.

This module provides production-grade structured logging with:
- JSON format for log aggregation (ELK, Datadog, CloudWatch)
- Request ID tracking for distributed tracing
- Sensitive data redaction
- Configurable log levels per module

Usage:
    from api.services.structured_logging import get_logger

    logger = get_logger("civicflow.classifier")
    logger.info("Classification complete", extra={
        "department": "roads",
        "authority": "BBMP",
        "duration_ms": 45.2
    })
"""

from __future__ import annotations

import json
import logging
import sys
import time
from contextvars import ContextVar
from datetime import datetime, UTC
from typing import Any

# Context variable for request tracking
request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)
user_id_ctx: ContextVar[str | None] = ContextVar("user_id", default=None)


class StructuredFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    # Fields to redact for security
    SENSITIVE_FIELDS = {
        "password", "token", "secret", "api_key", "authorization",
        "aadhaar", "pan", "phone", "email", "ssn"
    }

    def __init__(self, service_name: str = "civicflow", environment: str = "development"):
        super().__init__()
        self.service_name = service_name
        self.environment = environment

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        # Base log entry
        log_entry = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": self.service_name,
            "environment": self.environment,
        }

        # Add context variables
        request_id = request_id_ctx.get()
        if request_id:
            log_entry["request_id"] = request_id

        user_id = user_id_ctx.get()
        if user_id:
            log_entry["user_id"] = user_id

        # Add location info
        log_entry["location"] = {
            "file": record.filename,
            "line": record.lineno,
            "function": record.funcName,
        }

        # Add extra fields
        if hasattr(record, "extra") and record.extra:
            log_entry["data"] = self._redact_sensitive(record.extra)

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": self.formatException(record.exc_info),
            }

        # Add stack trace for errors and above
        if record.levelno >= logging.ERROR and record.stack_info:
            log_entry["stack_trace"] = self.formatStack(record.stack_info)

        return json.dumps(log_entry, default=str)

    def _redact_sensitive(self, data: dict[str, Any]) -> dict[str, Any]:
        """Redact sensitive fields in nested dictionaries."""
        redacted = {}
        for key, value in data.items():
            key_lower = key.lower()

            # Check if key is sensitive
            if any(sensitive in key_lower for sensitive in self.SENSITIVE_FIELDS):
                redacted[key] = "[REDACTED]"
            elif isinstance(value, dict):
                redacted[key] = self._redact_sensitive(value)
            elif isinstance(value, list):
                redacted[key] = [
                    self._redact_sensitive(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                redacted[key] = value

        return redacted


class StructuredLogger(logging.LoggerAdapter):
    """Logger adapter that adds structured extra fields."""

    def process(self, msg: str, kwargs: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        """Process the logging call to add extra fields."""
        extra = kwargs.get("extra", {})
        extra.update(self.extra)
        kwargs["extra"] = extra
        return msg, kwargs


def get_logger(name: str, **default_extra: Any) -> StructuredLogger:
    """Get a structured logger instance.

    Args:
        name: Logger name (usually module name)
        **default_extra: Default extra fields to include in all logs

    Returns:
        StructuredLogger instance
    """
    logger = logging.getLogger(name)
    return StructuredLogger(logger, default_extra)


def setup_logging(
    level: str = "INFO",
    service_name: str = "civicflow",
    environment: str = "development",
    json_format: bool = True,
) -> None:
    """Configure structured logging for the application.

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        service_name: Service name for log entries
        environment: Environment name (development, staging, production)
        json_format: Use JSON format (True) or human-readable (False)
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    root_logger.handlers.clear()

    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.DEBUG)

    if json_format:
        # Use structured JSON format
        formatter = StructuredFormatter(
            service_name=service_name,
            environment=environment,
        )
    else:
        # Use human-readable format for development
        formatter = logging.Formatter(
            fmt="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
            datefmt="%H:%M:%S",
        )

    handler.setFormatter(formatter)
    root_logger.addHandler(handler)

    # Configure third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("clickhouse_connect").setLevel(logging.WARNING)


# ── Context Management ──

def set_request_id(request_id: str) -> None:
    """Set the request ID in the logging context."""
    request_id_ctx.set(request_id)


def set_user_id(user_id: str) -> None:
    """Set the user ID in the logging context."""
    user_id_ctx.set(user_id)


def get_request_id() -> str | None:
    """Get the current request ID from context."""
    return request_id_ctx.get()


def get_user_id() -> str | None:
    """Get the current user ID from context."""
    return user_id_ctx.get()


def clear_context() -> None:
    """Clear all context variables."""
    request_id_ctx.set(None)
    user_id_ctx.set(None)


# ── Timing Utilities ──

class LogTimer:
    """Context manager for timing operations and logging duration."""

    def __init__(
        self,
        logger: StructuredLogger,
        operation: str,
        level: int = logging.INFO,
        **extra: Any,
    ):
        self.logger = logger
        self.operation = operation
        self.level = level
        self.extra = extra
        self.start_time: float = 0
        self.duration_ms: float = 0

    def __enter__(self) -> "LogTimer":
        self.start_time = time.perf_counter()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.duration_ms = (time.perf_counter() - self.start_time) * 1000

        log_data = {
            "operation": self.operation,
            "duration_ms": round(self.duration_ms, 2),
            **self.extra,
        }

        if exc_type is not None:
            log_data["error"] = str(exc_val)
            self.logger.log(logging.ERROR, f"{self.operation} failed", extra=log_data)
        else:
            self.logger.log(self.level, f"{self.operation} completed", extra=log_data)


def log_time(logger: StructuredLogger, operation: str, **extra: Any) -> LogTimer:
    """Create a timing context manager.

    Usage:
        with log_time(logger, "database_query", table="complaints"):
            # ... perform operation
    """
    return LogTimer(logger, operation, **extra)
