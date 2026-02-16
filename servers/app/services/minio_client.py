"""MinIO object storage client."""

from __future__ import annotations

import io

import structlog
from minio import Minio
from minio.error import S3Error

from app.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class MinIOService:
    """MinIO S3-compatible storage wrapper."""

    def __init__(self):
        self._client: Minio | None = None

    def _get_client(self) -> Minio:
        if self._client is None:
            self._client = Minio(
                endpoint=settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure,
            )
        return self._client

    def ensure_bucket(self):
        """Create the media bucket if it doesn't exist."""
        try:
            client = self._get_client()
            if not client.bucket_exists(settings.minio_bucket):
                client.make_bucket(settings.minio_bucket)
                logger.info("MinIO bucket created", bucket=settings.minio_bucket)
            else:
                logger.info("MinIO bucket exists", bucket=settings.minio_bucket)
        except Exception as e:
            logger.warning("MinIO unavailable", error=str(e))

    def upload_bytes(self, path: str, data: bytes, content_type: str) -> str:
        """Upload bytes to MinIO, return the object path."""
        try:
            client = self._get_client()
            client.put_object(
                bucket_name=settings.minio_bucket,
                object_name=path,
                data=io.BytesIO(data),
                length=len(data),
                content_type=content_type,
            )
            logger.debug("File uploaded to MinIO", path=path, size=len(data))
            return path
        except S3Error as e:
            logger.error("MinIO upload failed", error=str(e), path=path)
            raise

    def download_bytes(self, path: str) -> bytes:
        """Download a file from MinIO as bytes."""
        try:
            client = self._get_client()
            response = client.get_object(settings.minio_bucket, path)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as e:
            logger.error("MinIO download failed", error=str(e), path=path)
            raise

    def get_presigned_url(self, path: str, expires_hours: int = 1) -> str:
        """Get a presigned URL for file access."""
        from datetime import timedelta
        client = self._get_client()
        return client.presigned_get_object(
            settings.minio_bucket, path, expires=timedelta(hours=expires_hours)
        )


minio_service = MinIOService()
