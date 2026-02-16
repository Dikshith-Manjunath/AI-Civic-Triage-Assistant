"""Geocoding node: convert location string to lat/lon coordinates."""

from __future__ import annotations

import structlog

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


async def geocode_location(state: dict) -> dict:
    """Geocode the extracted location string to coordinates."""
    log = logger.bind(complaint_id=state["complaint_id"])
    location_str = state.get("location_str", "") or state.get("location", "")

    if not location_str:
        log.info("No location to geocode")
        return state

    try:
        from geopy.geocoders import Nominatim
        from geopy.adapters import AioHTTPAdapter

        async with Nominatim(
            user_agent="civicflow-triage",
            adapter_factory=AioHTTPAdapter,
            domain=settings.nominatim_url.replace("https://", "").replace("http://", ""),
        ) as geolocator:
            location = await geolocator.geocode(location_str, timeout=10)
            if location:
                log.info("Geocoded", lat=location.latitude, lon=location.longitude)
                return {
                    **state,
                    "lat": location.latitude,
                    "lon": location.longitude,
                }
            else:
                log.warning("Geocoding returned no result", location=location_str)
    except Exception as e:
        log.warning("Geocoding failed, using fallback", error=str(e))

    # Try simple geopy without async
    try:
        from geopy.geocoders import Nominatim as SyncNominatim
        geolocator = SyncNominatim(user_agent="civicflow-triage")
        location = geolocator.geocode(location_str, timeout=10)
        if location:
            return {
                **state,
                "lat": location.latitude,
                "lon": location.longitude,
            }
    except Exception as e:
        log.warning("Sync geocoding also failed", error=str(e))

    return state
