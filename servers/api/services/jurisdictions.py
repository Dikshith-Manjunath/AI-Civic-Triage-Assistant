"""Jurisdiction polygons for Bengaluru municipal authorities."""

from __future__ import annotations

# Simplified bounding box/polygons for Bengaluru authorities (placeholder)
# In a real implementation, these would be loaded from GeoJSON files.
# Coordinates are (longitude, latitude) for Shapely.

# BBMP Bounding Box (Roughly covering Bangalore Metropolitan area)
BBMP_POLYGON = [(77.4, 12.8), (77.8, 12.8), (77.8, 13.1), (77.4, 13.1), (77.4, 12.8)]

# BWSSB (Covers same area as BBMP usually)
BWSSB_POLYGON = BBMP_POLYGON

# BESCOM (Covers larger Bangalore region)
BESCOM_POLYGON = [(77.2, 12.6), (78.0, 12.6), (78.0, 13.3), (77.2, 13.3), (77.2, 12.6)]

# BMTC (Urban and Peri-urban)
BMTC_POLYGON = BESCOM_POLYGON

# BDA (Development areas, slightly larger than BBMP)
BDA_POLYGON = [(77.3, 12.7), (77.9, 12.7), (77.9, 13.2), (77.3, 13.2), (77.3, 12.7)]

JURISDICTIONS = {
    "BBMP": BBMP_POLYGON,
    "BWSSB": BWSSB_POLYGON,
    "BESCOM": BESCOM_POLYGON,
    "BMTC": BMTC_POLYGON,
    "BDA": BDA_POLYGON,
    "GBA": BDA_POLYGON,
    "BMRDA": BESCOM_POLYGON,
    "KSDB": BBMP_POLYGON,
    "BEML": BBMP_POLYGON,
}
