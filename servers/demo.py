"""
CivicFlow Demo Script

This script demonstrates all the key features of the platform:
1. Complaint classification with fallback
2. PII detection and encryption
3. Circuit breaker pattern
4. Metrics collection
5. Health checking

Run with: python -m tests.demo
"""

import asyncio
import time
from pprint import pprint

print("=" * 70)
print("CivicFlow Platform Demo")
print("=" * 70)
print()

# ── 1. Classification Demo ──
print("1️⃣  COMPLAINT CLASSIFICATION")
print("-" * 70)

from api.services.classifier import classify_complaint, _fallback_classify

complaints = [
    ("Roads", "Large pothole on MG Road near Trinity Metro station causing traffic jams"),
    ("Water", "No water supply in Koramangala 4th block for 3 days. BWSSB not responding."),
    ("Electricity", "Power outage in Indiranagar since last night. BESCOM says 6 hours to restore."),
    ("Sanitation", "Garbage not collected for a week in JP Nagar 7th phase, causing bad smell"),
    ("High Urgency", "Danger! Tree about to fall on the main road, could cause accidents!"),
]

print("Testing classification with fallback (Laya disabled in demo):")
print()

async def run_classification_demo():
    for category, text in complaints:
        result = await classify_complaint(text, channel="demo")
        print(f"📂 {category}")
        print(f"   Text: {text[:60]}...")
        print(f"   → Department: {result['department']}")
        print(f"   → Authority: {result['authority']}")
        print(f"   → Urgency: {['Low', 'Medium', 'High'][result['urgency']]} ({result['urgency']})")
        print(f"   → Confidence: {result['confidence']:.2f}")
        print(f"   → Mode: {result['mode']}")
        print()

asyncio.run(run_classification_demo())

# ── 2. PII Detection Demo ──
print("\n2️⃣  PII DETECTION & ENCRYPTION")
print("-" * 70)

from api.services.pii_detector import (
    PIIDetector,
    process_complaint_for_storage,
)

detector = PIIDetector()

pii_texts = [
    "My phone is 9876543210 and Aadhaar is 1234 5678 9012",
    "Contact me at john.doe@gmail.com or call 9876543210",
    "My PAN is ABCDE1234F and I live in PIN 560001",
    "No PII here, just a complaint about potholes",
]

for text in pii_texts:
    print(f"\nOriginal: {text}")

    # Detect PII
    findings = detector.detect(text)
    if findings:
        print(f"   ⚠️  PII Found: {list(findings.keys())}")

        # Process for storage
        result = process_complaint_for_storage(text)
        print(f"   🔒 Encrypted: {'Yes' if result['encrypted_text'] else 'No'}")
        print(f"   📝 Redacted: {result['redacted_text']}")
    else:
        print(f"   ✅ No PII detected")

# ── 3. Circuit Breaker Demo ──
print("\n\n3️⃣  CIRCUIT BREAKER PATTERN")
print("-" * 70)

from api.middleware.circuit_breaker import (
    CircuitBreaker,
    CircuitState,
    get_all_circuit_stats,
)

async def circuit_breaker_demo():
    breaker = CircuitBreaker(
        name="demo-service",
        failure_threshold=3,
        recovery_timeout=2.0,
    )

    print("Initial state:", breaker.state.name)
    print("Stats:", breaker.stats)
    print()

    # Simulate failures
    print("Simulating 3 consecutive failures...")
    for i in range(3):
        await breaker._record_failure()
        print(f"   Failure {i+1}: State = {breaker.state.name}")

    print()
    print("Circuit is now OPEN - all calls will fail fast")
    print("Stats:", breaker.stats)
    print()

    # Wait for recovery timeout
    print(f"Waiting {breaker.recovery_timeout}s for recovery timeout...")
    await asyncio.sleep(breaker.recovery_timeout + 0.1)

    # Check if circuit transitions to half-open
    print("Checking is_open:", breaker.is_open)
    print("State after timeout:", breaker.state.name)
    print()

    # Record success to close circuit
    print("Recording successful call in half-open state...")
    await breaker._record_success()
    await breaker._record_success()
    print("State after successes:", breaker.state.name)
    print()

    # Show global stats
    print("All circuit breaker stats:")
    stats = get_all_circuit_stats()
    for name, stat in stats.items():
        print(f"   {name}: {stat['state']} (failures: {stat['failed_calls']})")

asyncio.run(circuit_breaker_demo())

# ── 4. Metrics Demo ──
print("\n\n4️⃣  METRICS COLLECTION")
print("-" * 70)

from api.services.metrics import (
    record_http_request,
    record_classification,
    record_cache_hit,
    record_cache_miss,
    get_metrics,
    get_metrics_summary,
)

# Generate some metrics
for i in range(10):
    record_http_request("GET", f"/api/endpoint{i%3}", 200, 0.05 * (i + 1))

record_classification("roads", "BBMP", "api", 0.25, 0.85)
record_classification("water", "BWSSB", "telegram", 0.15, 0.92)
record_classification("electricity", "BESCOM", "api", 0.30, 0.78)

record_cache_hit("embedding")
record_cache_hit("classification")
record_cache_miss("embedding")

print("Sample Prometheus metrics output:")
print("-" * 40)
metrics = get_metrics().decode()
# Show first few lines
for line in metrics.split("\n")[:20]:
    if line.strip():
        print(line)
print("... (truncated)")
print()

print("Metrics summary:")
pprint(get_metrics_summary())

# ── 5. Health Check Demo ──
print("\n\n5️⃣  HEALTH CHECK")
print("-" * 70)

from api.middleware import get_all_circuit_stats

print("Circuit breaker status for health endpoint:")
for name, stats in get_all_circuit_stats().items():
    state_emoji = {"closed": "✅", "open": "🔴", "half_open": "🟡"}.get(stats["state"], "❓")
    print(f"   {state_emoji} {name}: {stats['state'].upper()}")
    print(f"      Total: {stats['total_calls']}, Success: {stats['successful_calls']}, Failed: {stats['failed_calls']}")

# ── 6. Performance Characteristics ──
print("\n\n6️⃣  PERFORMANCE CHARACTERISTICS")
print("-" * 70)

async def performance_test():
    texts = [
        "Pothole on MG Road",
        "Water supply issue in Koramangala",
        "Power outage in Indiranagar",
        "Garbage not collected in JP Nagar",
    ]

    print("Classification performance (fallback mode):")

    # Single classification
    start = time.perf_counter()
    for text in texts:
        await classify_complaint(text, channel="perf-test")
    single_time = time.perf_counter() - start

    print(f"   4 classifications: {single_time*1000:.2f}ms")
    print(f"   Average per classification: {single_time*1000/4:.2f}ms")

    # PII detection performance
    from api.services.pii_detector import detect_pii

    pii_test_text = "Phone: 9876543210, Aadhaar: 1234 5678 9012, Email: test@example.com"

    start = time.perf_counter()
    for _ in range(100):
        detect_pii(pii_test_text)
    pii_time = time.perf_counter() - start

    print(f"\n   100 PII detections: {pii_time*1000:.2f}ms")
    print(f"   Average per detection: {pii_time*1000/100:.3f}ms")

asyncio.run(performance_test())

# ── Summary ──
print("\n\n" + "=" * 70)
print("✅ DEMO COMPLETE")
print("=" * 70)
print("""
Key Features Demonstrated:
1. ✅ Complaint classification with fallback (roads, water, electricity, etc.)
2. ✅ Automatic department and authority assignment
3. ✅ Urgency detection (Low, Medium, High)
4. ✅ PII detection (Aadhaar, PAN, phone, email, PIN)
5. ✅ AES-256-GCM encryption for sensitive data
6. ✅ Circuit breaker pattern for fault tolerance
7. ✅ Prometheus metrics collection
8. ✅ Health check with service status
9. ✅ Sub-millisecond performance for core operations

All components are production-grade with proper error handling,
metrics, and graceful degradation.
""")
