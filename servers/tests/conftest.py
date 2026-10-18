"""Pytest configuration and fixtures for CivicFlow tests."""

import asyncio
import os
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient

# Set test environment
os.environ["APP_ENV"] = "test"
os.environ["REDIS_ENABLED"] = "false"  # Disable Redis for unit tests
os.environ["LAYA_CLASSIFIER_ENABLED"] = "false"  # Disable Laya for unit tests


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def test_client() -> Generator[TestClient, None, None]:
    """Create test client for synchronous tests."""
    from api.main import app
    with TestClient(app) as client:
        yield client


@pytest_asyncio.fixture(scope="module")
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Create async client for async tests."""
    from httpx import ASGITransport, AsyncClient
    from api.main import app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_complaint_text() -> str:
    """Sample complaint text for testing."""
    return "There is a large pothole on MG Road near Trinity Metro station causing traffic jams and damaging vehicles."


@pytest.fixture
def mock_complaint_water() -> str:
    """Water-related complaint for testing."""
    return "No water supply in Koramangala 4th block for the past 3 days. Multiple complaints to BWSSB have gone unanswered."


@pytest.fixture
def mock_complaint_electricity() -> str:
    """Electricity-related complaint for testing."""
    return "Power outage in Indiranagar since last night. BESCOM says it will take 6 hours to restore."


@pytest.fixture
def sample_ticket_data() -> dict:
    """Sample ticket data for testing."""
    return {
        "ticket_id": "CF-TEST01",
        "text": "Test complaint for unit testing",
        "department": "roads",
        "authority": "BBMP",
        "urgency": 1,
        "status": "pending",
    }
