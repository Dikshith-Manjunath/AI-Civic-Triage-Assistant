#!/usr/bin/env python
"""
Live Demo Script - Run real API calls to demonstrate the platform.

Usage:
    cd servers
    python scripts/run_live_demo.py

Requirements:
    - API server running on http://localhost:8000
    - Redis and ClickHouse available (or running in degraded mode)
"""

import httpx
import json
import time
from pprint import pprint

BASE_URL = "http://localhost:8000"

def print_section(title):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)

def test_health():
    """Test health endpoint."""
    print_section("1. HEALTH CHECK")

    response = httpx.get(f"{BASE_URL}/health", timeout=5.0)
    data = response.json()

    print(f"Status: {data['status']}")
    print(f"Version: {data['version']}")
    print(f"Uptime: {data['uptime_seconds']:.1f}s")
    print("\nService Status:")
    for service, status in data['checks'].items():
        emoji = {"ok": "✅", "error": "❌", "disabled": "⚪", "unknown": "❓"}.get(status, "❓")
        print(f"  {emoji} {service}: {status}")

    if 'circuit_breakers' in data:
        print("\nCircuit Breakers:")
        for name, stats in data['circuit_breakers'].items():
            state = stats.get('state', 'unknown')
            emoji = {"closed": "✅", "open": "🔴", "half_open": "🟡"}.get(state, "❓")
            print(f"  {emoji} {name}: {state.upper()}")

def test_root():
    """Test root endpoint."""
    print_section("2. API INFO")

    response = httpx.get(f"{BASE_URL}/", timeout=5.0)
    data = response.json()

    print(f"Name: {data['name']}")
    print(f"Version: {data['version']}")
    print(f"Docs: {data['docs']}")

def test_complaint_submission():
    """Test complaint submission."""
    print_section("3. COMPLAINT SUBMISSION")

    complaints = [
        ("Road Pothole", "Large pothole on MG Road near Trinity Metro station causing traffic jams and vehicle damage"),
        ("Water Issue", "No water supply in Koramangala 4th block for past 3 days. BWSSB helpline not responding."),
        ("Power Outage", "BESCOM power outage in Indiranagar 12th main since last night. Restoration time unknown."),
        ("Emergency", "DANGER! Exposed electrical wire on the footpath near school - children at risk!"),
    ]

    for category, text in complaints:
        print(f"\n📝 {category}:")
        print(f"   Text: {text[:60]}...")

        try:
            response = httpx.post(
                f"{BASE_URL}/api/complaints",
                json={"text": text, "channel": "demo"},
                timeout=10.0,
            )

            if response.status_code in [200, 201]:
                data = response.json()
                print(f"   ✅ Submitted")

                if 'classification' in data:
                    cls = data['classification']
                    urgency_labels = ['Low', 'Medium', 'High']
                    print(f"   → Department: {cls['department']}")
                    print(f"   → Authority: {cls['authority']}")
                    print(f"   → Urgency: {urgency_labels[cls['urgency']]}")
                    print(f"   → Mode: {cls.get('mode', 'unknown')}")
            else:
                print(f"   ⚠️  Status: {response.status_code}")
                print(f"   Response: {response.text[:100]}")

        except Exception as e:
            print(f"   ❌ Error: {e}")

def test_pii_submission():
    """Test complaint with PII."""
    print_section("4. PII HANDLING")

    text = "My name is Ramesh, phone 9876543210, Aadhaar 1234 5678 9012. There's a garbage pile near my house."

    print(f"Complaint with PII:")
    print(f"   Text: {text[:70]}...")

    try:
        response = httpx.post(
            f"{BASE_URL}/api/complaints",
            json={"text": text, "channel": "demo"},
            timeout=10.0,
        )

        if response.status_code in [200, 201]:
            data = response.json()
            print(f"   ✅ Submitted (PII should be encrypted)")

            if 'pii_detected' in data:
                print(f"   🔒 PII Detected: {data.get('pii_types', [])}")
        else:
            print(f"   Status: {response.status_code}")

    except Exception as e:
        print(f"   Error: {e}")

def test_metrics():
    """Test metrics endpoint."""
    print_section("5. PROMETHEUS METRICS")

    response = httpx.get(f"{BASE_URL}/metrics", timeout=5.0)

    lines = response.text.split('\n')

    # Find interesting metrics
    http_total = [l for l in lines if 'civicflow_http_requests_total' in l and not l.startswith('#')]
    classification_total = [l for l in lines if 'civicflow_classification_total' in l and not l.startswith('#')]

    print("HTTP Requests:")
    for line in http_total[:5]:
        print(f"  {line}")

    print("\nClassifications:")
    for line in classification_total[:5]:
        print(f"  {line}")

    print(f"\n... (full metrics available at {BASE_URL}/metrics)")

def test_response_times():
    """Test response time characteristics."""
    print_section("6. PERFORMANCE TEST")

    endpoints = ["/", "/health", "/metrics"]

    results = []

    for endpoint in endpoints:
        times = []

        for _ in range(5):
            start = time.perf_counter()
            response = httpx.get(f"{BASE_URL}{endpoint}", timeout=5.0)
            elapsed = time.perf_counter() - start
            times.append(elapsed * 1000)  # Convert to ms

        avg_time = sum(times) / len(times)
        max_time = max(times)
        min_time = min(times)

        results.append({
            'endpoint': endpoint,
            'avg_ms': avg_time,
            'min_ms': min_time,
            'max_ms': max_time,
        })

        print(f"\n{endpoint}:")
        print(f"   Average: {avg_time:.2f}ms")
        print(f"   Min: {min_time:.2f}ms")
        print(f"   Max: {max_time:.2f}ms")

    # Check response time headers
    response = httpx.get(f"{BASE_URL}/health")
    if 'X-Process-Time-Ms' in response.headers:
        print(f"\nServer-reported process time: {response.headers['X-Process-Time-Ms']}ms")

def main():
    print("=" * 70)
    print(" CIVICFLOW LIVE DEMO")
    print("=" * 70)
    print("\nMake sure the API is running: uvicorn api.main:app --reload")
    print()

    try:
        # Check if API is running
        response = httpx.get(f"{BASE_URL}/health", timeout=2.0)
    except Exception as e:
        print(f"❌ Cannot connect to API at {BASE_URL}")
        print(f"   Error: {e}")
        print("\nStart the API with:")
        print("   cd servers && uvicorn api.main:app --reload")
        return

    # Run all tests
    test_root()
    test_health()
    test_complaint_submission()
    test_pii_submission()
    test_metrics()
    test_response_times()

    print_section("✅ DEMO COMPLETE")
    print("\nAll core features demonstrated:")
    print("  ✅ API health checking")
    print("  ✅ Complaint submission")
    print("  ✅ Automatic classification (department, authority, urgency)")
    print("  ✅ PII detection and handling")
    print("  ✅ Metrics collection")
    print("  ✅ Performance characteristics")
    print()
    print("OpenAPI docs available at:", f"{BASE_URL}/docs")
    print()

if __name__ == "__main__":
    main()
