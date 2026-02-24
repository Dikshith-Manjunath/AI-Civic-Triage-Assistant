-- ClickHouse schema for CivicFlow Phase 1-5
-- Run once against the target ClickHouse instance.

CREATE DATABASE IF NOT EXISTS civicflow;

CREATE TABLE IF NOT EXISTS civicflow.civic_complaints
(
    id          UUID          DEFAULT generateUUIDv4(),
    timestamp   DateTime64(3) DEFAULT now64(3),
    dept        LowCardinality(String),
    authority   LowCardinality(String),
    urgency     UInt8,          -- 0 = Low, 1 = Medium, 2 = High
    summary     String,
    reply       String,
    status      LowCardinality(String) DEFAULT 'pending',
    channel     LowCardinality(String) DEFAULT 'web',
    raw_text    String,         -- original complaint text
    embedding   Array(Float32), -- Phase 3 embeddings
    approved_by String DEFAULT '',
    approved_at DateTime64(3) DEFAULT toDateTime64('1970-01-01 00:00:00', 3)
)
ENGINE = MergeTree()
ORDER BY (timestamp, dept, authority)
SETTINGS index_granularity = 8192;

-- Phase 5: Ensure new columns exist on pre-existing tables
ALTER TABLE civicflow.civic_complaints ADD COLUMN IF NOT EXISTS approved_by String DEFAULT '';
ALTER TABLE civicflow.civic_complaints ADD COLUMN IF NOT EXISTS approved_at DateTime64(3) DEFAULT toDateTime64('1970-01-01 00:00:00', 3);

-- Phase 2: Media metadata table
CREATE TABLE IF NOT EXISTS civicflow.civic_media
(
    id              UUID          DEFAULT generateUUIDv4(),
    complaint_id    UUID,
    type            LowCardinality(String),   -- 'image', 'audio', 'pdf'
    object_path     String,                   -- MinIO object key
    filename        String,                   -- original filename
    content_type    String,                   -- MIME type
    size_bytes      UInt64,
    created_at      DateTime64(3) DEFAULT now64(3)
)
ENGINE = MergeTree()
ORDER BY (complaint_id, type)
SETTINGS index_granularity = 8192;

-- Phase 6: SOP document chunks for RAG
CREATE TABLE IF NOT EXISTS civicflow.sop_documents
(
    id          UUID          DEFAULT generateUUIDv4(),
    source      String,                     -- origin PDF filename
    chunk_text  String,                     -- text chunk
    embedding   Array(Float32)              -- 384-dim embedding vector
)
ENGINE = MergeTree()
ORDER BY id
SETTINGS index_granularity = 8192;
