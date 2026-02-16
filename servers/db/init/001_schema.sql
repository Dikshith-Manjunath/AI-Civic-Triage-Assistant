-- CivicFlow ClickHouse Schema Initialization
-- This script runs automatically via docker-entrypoint-initdb.d

CREATE DATABASE IF NOT EXISTS civicflow;

-- ── Civic Complaints (Main Ticket Table) ─────────────────────────
CREATE TABLE IF NOT EXISTS civicflow.civic_complaints (
    id UUID,
    timestamp DateTime64(3),
    dept String,
    urgency UInt8,
    summary String,
    citizen_reply String DEFAULT '',
    lat Float64 DEFAULT 0.0,
    lon Float64 DEFAULT 0.0,
    status String DEFAULT 'processing',
    channel String DEFAULT 'web',
    embedding Array(Float32) DEFAULT [],
    location_str String DEFAULT ''
) ENGINE = MergeTree()
ORDER BY timestamp;

-- ── Civic Media (Attachments) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS civicflow.civic_media (
    id UUID,
    complaint_id UUID,
    type Enum8('text' = 1, 'audio' = 2, 'image' = 3, 'pdf' = 4),
    file_path String,
    caption String DEFAULT '',
    whisper_confidence Float32 DEFAULT 0.0,
    created_at DateTime64(3) DEFAULT now64()
) ENGINE = MergeTree()
ORDER BY created_at;

-- ── Materialized View: Daily Department Counts ──────────────────
CREATE TABLE IF NOT EXISTS civicflow.daily_dept_counts (
    day Date,
    dept String,
    cnt UInt64
) ENGINE = SummingMergeTree()
ORDER BY (day, dept);

CREATE MATERIALIZED VIEW IF NOT EXISTS civicflow.mv_daily_dept_counts
TO civicflow.daily_dept_counts AS
SELECT
    toDate(timestamp) AS day,
    dept,
    count() AS cnt
FROM civicflow.civic_complaints
GROUP BY day, dept;

-- ── Materialized View: Urgency Hourly Distribution ──────────────
CREATE TABLE IF NOT EXISTS civicflow.hourly_urgency (
    hour DateTime,
    urgency UInt8,
    cnt UInt64
) ENGINE = SummingMergeTree()
ORDER BY (hour, urgency);

CREATE MATERIALIZED VIEW IF NOT EXISTS civicflow.mv_hourly_urgency
TO civicflow.hourly_urgency AS
SELECT
    toStartOfHour(timestamp) AS hour,
    urgency,
    count() AS cnt
FROM civicflow.civic_complaints
GROUP BY hour, urgency;

-- ── Sample Seed Data (for development) ──────────────────────────
INSERT INTO civicflow.civic_complaints (id, timestamp, dept, urgency, summary, citizen_reply, lat, lon, status, channel) VALUES
    (generateUUIDv4(), now64(), 'water', 2, 'Major water pipe burst on MG Road causing flooding in residential area', 'We have escalated this to the water department. Emergency crew dispatched.', 12.9716, 77.5946, 'triaged', 'web'),
    (generateUUIDv4(), now64() - 3600, 'roads', 1, 'Large pothole on 5th Cross Road near park junction, vehicle damage reported', 'Your complaint has been logged. Road maintenance team will inspect within 48 hours.', 12.9352, 77.6245, 'triaged', 'whatsapp'),
    (generateUUIDv4(), now64() - 7200, 'sanitation', 1, 'Garbage not collected for 3 days in Block C, foul smell reported', 'Apologies for the inconvenience. Sanitation team has been notified for priority collection.', 12.9698, 77.7500, 'assigned', 'phone'),
    (generateUUIDv4(), now64() - 10800, 'electricity', 2, 'Exposed live wire on street light pole near school, immediate danger to children', 'URGENT: Electricity department notified. Please maintain safe distance. Team en route.', 13.0827, 77.5877, 'triaged', 'web'),
    (generateUUIDv4(), now64() - 14400, 'traffic', 0, 'Traffic signal not working at MG Road - Brigade Road junction during peak hours', 'Traffic department has been informed. Temporary traffic management being arranged.', 12.9750, 77.6066, 'processing', 'email'),
    (generateUUIDv4(), now64() - 18000, 'parks', 0, 'Broken bench and damaged swing set in Cubbon Park children play area', 'Parks department will schedule repair. Thank you for reporting.', 12.9763, 77.5929, 'triaged', 'web'),
    (generateUUIDv4(), now64() - 86400, 'water', 1, 'Low water pressure in Indiranagar 12th Main for the past week', 'Water supply team is investigating the pressure issue in your area.', 12.9784, 77.6408, 'assigned', 'whatsapp'),
    (generateUUIDv4(), now64() - 172800, 'sanitation', 2, 'Open drain overflowing onto road in Koramangala 4th Block, health hazard', 'Emergency sanitation crew dispatched. Expected resolution within 12 hours.', 12.9352, 77.6245, 'triaged', 'phone');
