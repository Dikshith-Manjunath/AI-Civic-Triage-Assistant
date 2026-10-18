"""Unit tests for metrics collection."""

import pytest
from api.services.metrics import (
    record_http_request,
    record_classification,
    record_cache_hit,
    record_cache_miss,
    record_db_query,
    record_kafka_message_produced,
    record_ticket_created,
    record_pii_detected,
    get_metrics,
    get_metrics_content_type,
    time_db_query,
    time_classification,
)


class TestHTTPMetrics:
    """Test HTTP request metrics."""

    def test_record_http_request(self):
        """Test recording HTTP request metrics."""
        # Should not raise
        record_http_request(
            method="GET",
            endpoint="/api/complaints",
            status_code=200,
            duration=0.05,
        )

    def test_record_various_status_codes(self):
        """Test recording different status codes."""
        for status in [200, 201, 400, 404, 500, 503]:
            record_http_request(
                method="POST",
                endpoint="/api/test",
                status_code=status,
                duration=0.01,
            )


class TestClassificationMetrics:
    """Test classification metrics."""

    def test_record_classification_basic(self):
        """Test basic classification metric recording."""
        record_classification(
            department="roads",
            authority="BBMP",
            channel="api",
            duration=0.25,
        )

    def test_record_classification_with_confidence(self):
        """Test classification with confidence score."""
        record_classification(
            department="water",
            authority="BWSSB",
            channel="telegram",
            duration=0.15,
            confidence=0.85,
        )


class TestCacheMetrics:
    """Test cache metrics."""

    def test_record_cache_hit(self):
        """Test cache hit recording."""
        record_cache_hit("embedding")

    def test_record_cache_miss(self):
        """Test cache miss recording."""
        record_cache_miss("embedding")

    def test_cache_types(self):
        """Test various cache types."""
        cache_types = ["embedding", "classification", "sop_retrieval", "ticket"]

        for cache_type in cache_types:
            record_cache_hit(cache_type)
            record_cache_miss(cache_type)


class TestDatabaseMetrics:
    """Test database metrics."""

    def test_record_db_query(self):
        """Test database query metric recording."""
        record_db_query(
            query_type="SELECT",
            table="civic_complaints",
            duration=0.005,
        )

    def test_time_db_query_context_manager(self):
        """Test timing context manager for DB queries."""
        import time

        with time_db_query("INSERT", "tickets"):
            time.sleep(0.001)  # Simulate query

    def test_various_query_types(self):
        """Test various query types."""
        query_types = ["SELECT", "INSERT", "UPDATE", "DELETE"]

        for query_type in query_types:
            record_db_query(
                query_type=query_type,
                table="test_table",
                duration=0.001,
            )


class TestKafkaMetrics:
    """Test Kafka metrics."""

    def test_record_kafka_message_produced(self):
        """Test Kafka message production metric."""
        record_kafka_message_produced("civic.complaints")

    def test_record_kafka_message_consumed(self):
        """Test Kafka message consumption metric."""
        from api.services.metrics import record_kafka_message_consumed

        record_kafka_message_consumed(
            topic="civic.complaints",
            consumer_group="civicflow-worker-group",
            duration=0.1,
        )


class TestBusinessMetrics:
    """Test business-level metrics."""

    def test_record_ticket_created(self):
        """Test ticket creation metric."""
        record_ticket_created(
            department="roads",
            authority="BBMP",
            urgency=2,
        )

    def test_record_pii_detected(self):
        """Test PII detection metric."""
        record_pii_detected("phone")
        record_pii_detected("aadhaar", count=2)


class TestMetricsExport:
    """Test metrics export functionality."""

    def test_get_metrics(self):
        """Test getting Prometheus metrics output."""
        metrics = get_metrics()

        assert isinstance(metrics, bytes)
        # Should contain metric names
        assert b"civicflow_" in metrics

    def test_get_metrics_content_type(self):
        """Test getting content type for metrics."""
        content_type = get_metrics_content_type()

        assert "text/plain" in content_type
        # Prometheus client uses version=1.0.0 or version=0.0.4 depending on version
        assert "version=" in content_type

    def test_time_classification_context_manager(self):
        """Test timing context manager for classification."""
        import time

        with time_classification("api"):
            time.sleep(0.001)  # Simulate classification


class TestMetricsSummary:
    """Test metrics summary for health checks."""

    def test_get_metrics_summary(self):
        """Test getting metrics summary."""
        from api.services.metrics import get_metrics_summary

        summary = get_metrics_summary()

        assert isinstance(summary, dict)
        assert "http_requests_total" in summary
        assert "classification_count" in summary
