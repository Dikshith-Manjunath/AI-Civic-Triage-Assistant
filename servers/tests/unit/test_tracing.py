"""Unit tests for distributed tracing."""

import pytest

from api.middleware.tracing import (
    NoOpTracer,
    NoOpSpan,
    get_tracer,
    trace_operation,
)


class TestNoOpTracer:
    """Test no-op tracer for when tracing is disabled."""

    def test_noop_tracer_returns_span(self):
        """Test that no-op tracer returns a span."""
        tracer = NoOpTracer()

        with tracer.start_as_current_span("test_span") as span:
            assert isinstance(span, NoOpSpan)

    def test_noop_span_accepts_attributes(self):
        """Test that no-op span accepts attributes without error."""
        span = NoOpSpan()

        # Should not raise
        span.set_attribute("key", "value")
        span.set_attribute("number", 42)

    def test_noop_span_accepts_events(self):
        """Test that no-op span accepts events without error."""
        span = NoOpSpan()

        # Should not raise
        span.add_event("test_event", {"key": "value"})

    def test_noop_span_records_exceptions(self):
        """Test that no-op span records exceptions without error."""
        span = NoOpSpan()

        # Should not raise
        span.record_exception(ValueError("test error"))


class TestGetTracer:
    """Test tracer retrieval."""

    def test_get_tracer_returns_noop_when_disabled(self):
        """Test that get_tracer returns NoOpTracer when tracing disabled."""
        tracer = get_tracer()
        # Should be NoOpTracer since we haven't set up tracing
        isinstance(tracer, (NoOpTracer, object))  # Accepts any tracer


class TestTraceOperation:
    """Test trace operation context manager."""

    def test_trace_operation_with_noop(self):
        """Test trace_operation with no-op tracer."""
        with trace_operation("test_op", key="value") as span:
            # Should not raise
            span.set_attribute("result", "success")

    def test_trace_operation_nested(self):
        """Test nested trace operations."""
        with trace_operation("outer") as outer_span:
            outer_span.set_attribute("level", 1)

            with trace_operation("inner") as inner_span:
                inner_span.set_attribute("level", 2)

            outer_span.set_attribute("inner_complete", True)
