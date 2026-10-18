"""OpenTelemetry Distributed Tracing for CivicFlow.

This module provides distributed tracing capabilities for:
- Request tracing across services
- Performance monitoring
- Error tracking
- Integration with Jaeger, Zipkin, or cloud providers

Usage:
    from api.middleware.tracing import setup_tracing, get_tracer

    # During app startup
    setup_tracing(app, service_name="civicflow-api")

    # In request handlers
    tracer = get_tracer()
    with tracer.start_as_current_span("classify_complaint") as span:
        span.set_attribute("department", "roads")
        # ... perform classification
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Iterator

from fastapi import FastAPI, Request, Response

from api.config import settings

logger = logging.getLogger("civicflow.tracing")

# Tracer instance (lazy loaded)
_tracer: Any = None
_tracing_enabled: bool = False


def setup_tracing(
    app: FastAPI,
    service_name: str = "civicflow-api",
    otlp_endpoint: str | None = None,
    sample_rate: float = 1.0,
) -> None:
    """Setup OpenTelemetry tracing for the application.

    Args:
        app: FastAPI application instance
        service_name: Name of the service for trace identification
        otlp_endpoint: OTLP collector endpoint (default: from settings)
        sample_rate: Sampling rate (0.0 to 1.0, default: 1.0 = all requests)
    """
    global _tracer, _tracing_enabled

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

        # Check if tracing should be enabled
        endpoint = otlp_endpoint or settings.otlp_endpoint
        if not endpoint:
            logger.info("OTLP endpoint not configured, tracing disabled")
            _tracing_enabled = False
            return

        # Create resource with service metadata
        resource = Resource.create({
            "service.name": service_name,
            "service.version": settings.app_version if hasattr(settings, 'app_version') else "0.7.0",
            "deployment.environment": settings.app_env,
        })

        # Create tracer provider with sampling
        sampler = TraceIdRatioBased(sample_rate)
        provider = TracerProvider(resource=resource, sampler=sampler)

        # Configure OTLP exporter
        try:
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

            otlp_exporter = OTLPSpanExporter(endpoint=endpoint)
            provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

        except ImportError:
            # Fall back to console exporter for development
            from opentelemetry.sdk.trace.export import ConsoleSpanExporter

            logger.warning("OTLP exporter not available, using console exporter")
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))

        # Set the tracer provider
        trace.set_tracer_provider(provider)

        # Get tracer instance
        _tracer = trace.get_tracer(service_name)
        _tracing_enabled = True

        logger.info("OpenTelemetry tracing enabled (endpoint=%s, sample_rate=%.2f)", endpoint, sample_rate)

    except ImportError:
        logger.warning("OpenTelemetry not installed, tracing disabled. Install with: pip install opentelemetry-api opentelemetry-sdk")
        _tracing_enabled = False

    except Exception as exc:
        logger.error("Failed to setup tracing: %s", exc)
        _tracing_enabled = False


def get_tracer() -> Any:
    """Get the tracer instance.

    Returns None if tracing is not enabled.
    """
    if _tracing_enabled and _tracer:
        return _tracer

    # Return a no-op tracer
    return NoOpTracer()


class NoOpTracer:
    """No-op tracer for when tracing is disabled."""

    @contextmanager
    def start_as_current_span(self, name: str, **kwargs: Any) -> Iterator["NoOpSpan"]:
        yield NoOpSpan()


class NoOpSpan:
    """No-op span for when tracing is disabled."""

    def set_attribute(self, key: str, value: Any) -> None:
        pass

    def set_status(self, status: Any) -> None:
        pass

    def record_exception(self, exception: Exception) -> None:
        pass

    def add_event(self, name: str, attributes: dict[str, Any] | None = None) -> None:
        pass


def start_span(name: str, **attributes: Any) -> Any:
    """Start a new tracing span.

    Usage:
        span = start_span("database_query", table="complaints", operation="SELECT")
        try:
            # ... perform operation
            span.set_attribute("rows_returned", 42)
        except Exception as e:
            span.record_exception(e)
            raise
        finally:
            span.end()
    """
    tracer = get_tracer()
    span = tracer.start_as_current_span(name)

    # Set initial attributes
    for key, value in attributes.items():
        span.set_attribute(key, value)

    return span


@contextmanager
def trace_operation(name: str, **attributes: Any) -> Iterator[Any]:
    """Context manager for tracing operations.

    Usage:
        with trace_operation("classify_complaint", channel="api") as span:
            result = classify(text)
            span.set_attribute("department", result["department"])
    """
    tracer = get_tracer()
    with tracer.start_as_current_span(name) as span:
        # Set initial attributes
        for key, value in attributes.items():
            span.set_attribute(key, value)

        yield span


# ── FastAPI Middleware ──

def add_tracing_middleware(app: FastAPI) -> None:
    """Add tracing middleware to FastAPI app."""

    @app.middleware("http")
    async def tracing_middleware(request: Request, call_next) -> Response:
        """Middleware to create spans for each request."""
        if not _tracing_enabled:
            return await call_next(request)

        tracer = get_tracer()

        # Create span name from route
        route = request.url.path
        method = request.method

        with tracer.start_as_current_span(f"{method} {route}") as span:
            # Set HTTP attributes
            span.set_attribute("http.method", method)
            span.set_attribute("http.url", str(request.url))
            span.set_attribute("http.route", route)
            span.set_attribute("http.scheme", request.url.scheme)
            span.set_attribute("http.host", request.url.hostname or "unknown")

            # Set user context if available
            user_id = request.headers.get("X-User-ID")
            if user_id:
                span.set_attribute("user.id", user_id)

            try:
                response = await call_next(request)
                span.set_attribute("http.status_code", response.status_code)

                # Set span status based on HTTP status
                if response.status_code >= 500:
                    from opentelemetry.trace import Status, StatusCode
                    span.set_status(Status(StatusCode.ERROR))

                return response

            except Exception as exc:
                span.record_exception(exc)
                from opentelemetry.trace import Status, StatusCode
                span.set_status(Status(StatusCode.ERROR))
                raise


# ── Span Utilities ──

def record_request_metrics(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
) -> None:
    """Record request metrics in the current span."""
    if not _tracing_enabled:
        return

    span = get_tracer().start_as_current_span("http.request")
    span.set_attribute("http.method", method)
    span.set_attribute("http.path", path)
    span.set_attribute("http.status_code", status_code)
    span.set_attribute("http.duration_ms", duration_ms)


def add_span_event(name: str, **attributes: Any) -> None:
    """Add an event to the current span."""
    if not _tracing_enabled:
        return

    tracer = get_tracer()
    # In a real implementation, we'd get the current span from context
    # This is a simplified version
    logger.debug("Span event: %s - %s", name, attributes)
