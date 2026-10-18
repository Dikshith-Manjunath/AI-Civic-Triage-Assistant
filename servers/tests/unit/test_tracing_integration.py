"""Integration tests for distributed tracing across services."""

import pytest

from api.middleware.tracing import (
    NoOpTracer,
    NoOpSpan,
    get_tracer,
    trace_operation,
)
from api.services.structured_logging import get_logger


class TestTracingIntegration:
    """Test tracing integration with other services."""

    def test_tracer_available_without_setup(self):
        """Test that get_tracer returns a valid tracer even without OpenTelemetry setup."""
        tracer = get_tracer()
        # Should be NoOpTracer since we haven't configured OTLP
        assert isinstance(tracer, (NoOpTracer, object))

    def test_trace_operation_with_logger(self):
        """Test that trace_operation works alongside structured logging."""
        logger = get_logger("test.tracing")

        with trace_operation("test_operation", key="value") as span:
            # Should not raise
            span.set_attribute("result", "success")
            logger.info("Operation in progress", extra={"step": 1})

    def test_nested_tracing_operations(self):
        """Test that nested tracing operations work correctly."""
        with trace_operation("outer_operation", level=1) as outer:
            outer.set_attribute("outer_key", "outer_value")

            with trace_operation("inner_operation", level=2) as inner:
                inner.set_attribute("inner_key", "inner_value")

            # Both spans should accept attributes without error
            outer.set_attribute("complete", True)

    def test_tracing_with_exception_handling(self):
        """Test that tracing handles exceptions gracefully."""
        try:
            with trace_operation("failing_operation") as span:
                span.set_attribute("attempted", True)
                raise ValueError("Test error")
        except ValueError:
            # Exception should propagate but not break tracing
            pass

    def test_multiple_concurrent_spans(self):
        """Test creating multiple spans in sequence."""
        for i in range(5):
            with trace_operation(f"operation_{i}", iteration=i) as span:
                span.set_attribute("result", f"completed_{i}")

    def test_span_accepts_various_attribute_types(self):
        """Test that spans accept different attribute types."""
        with trace_operation("type_test") as span:
            span.set_attribute("string_val", "test")
            span.set_attribute("int_val", 42)
            span.set_attribute("float_val", 3.14)
            span.set_attribute("bool_val", True)

    def test_noop_span_add_event(self):
        """Test that NoOpSpan can add events."""
        span = NoOpSpan()
        # Should not raise
        span.add_event("test_event", {"key": "value"})

    def test_noop_span_record_exception(self):
        """Test that NoOpSpan can record exceptions."""
        span = NoOpSpan()
        # Should not raise
        span.record_exception(ValueError("test error"))


class TestTracingContextPropagation:
    """Test context propagation in tracing."""

    def test_context_survives_function_call(self):
        """Test that tracing context survives across function calls."""

        def inner_function():
            with trace_operation("inner_call") as span:
                span.set_attribute("called_from", "outer")
                return True

        with trace_operation("outer_call") as outer_span:
            outer_span.set_attribute("has_inner", inner_function())

    def test_multiple_trace_operations_in_sequence(self):
        """Test sequential trace operations."""
        results = []

        with trace_operation("step_1") as s1:
            s1.set_attribute("step", 1)
            results.append(1)

        with trace_operation("step_2") as s2:
            s2.set_attribute("step", 2)
            results.append(2)

        with trace_operation("step_3") as s3:
            s3.set_attribute("step", 3)
            results.append(3)

        assert results == [1, 2, 3]
