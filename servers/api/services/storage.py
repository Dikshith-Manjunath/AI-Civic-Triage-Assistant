"""MinIO storage service — upload media files and manage the complaints bucket."""

from __future__ import annotations

import io
import logging
from typing import BinaryIO

from minio import Minio
from minio.error import S3Error

from api.config import settings

logger = logging.getLogger("civicflow.storage")

_client: Minio | None = None


def get_minio_client() -> Minio:
    """Return a module-level MinIO client (lazy singleton)."""
    global _client
    if _client is None:
        logger.info("Connecting to MinIO at %s", settings.minio_endpoint)
        _client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
    return _client


def ensure_bucket() -> None:
    """Create the complaints bucket if it does not already exist."""
    client = get_minio_client()
    bucket = settings.minio_bucket
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)
        logger.info("Created MinIO bucket: %s", bucket)
    else:
        logger.debug("MinIO bucket already exists: %s", bucket)


def upload_to_minio(
    data: bytes | BinaryIO,
    complaint_id: str,
    media_type: str,
    filename: str,
    content_type: str = "application/octet-stream",
) -> str:
    """
    Upload a file to MinIO under the complaints bucket.

    Object key layout:  <media_type>/<complaint_id>/<filename>
    Returns the full object path (key).
    """
    client = get_minio_client()
    bucket = settings.minio_bucket
    object_key = f"{media_type}/{complaint_id}/{filename}"

    if isinstance(data, bytes):
        data_stream: BinaryIO = io.BytesIO(data)
        length = len(data)
    else:
        # Seek to end to get length, then rewind
        data.seek(0, 2)
        length = data.tell()
        data.seek(0)
        data_stream = data

    try:
        client.put_object(
            bucket_name=bucket,
            object_name=object_key,
            data=data_stream,
            length=length,
            content_type=content_type,
        )
        logger.info(
            "Uploaded %s to MinIO: %s/%s (%d bytes)",
            media_type, bucket, object_key, length,
        )
    except S3Error as exc:
        logger.error("MinIO upload failed: %s", exc)
        raise

    return object_key
