"""
Object Storage Service - MinIO / S3-compatible backend.
Provides upload, download, presigned URL, and delete operations.
Falls back to local filesystem if MinIO is unavailable.
"""

import io
import logging
from pathlib import Path
from typing import Optional, BinaryIO
from datetime import timedelta
from urllib.parse import urljoin

from config import settings

logger = logging.getLogger("storage_service")

# Lazy MinIO import
_minio_client = None
_use_local_fallback = False


def _get_minio_client():
    """Initialize MinIO client lazily."""
    global _minio_client, _use_local_fallback

    if _minio_client is not None:
        return _minio_client

    try:
        from minio import Minio
        from minio.error import S3Error

        client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )

        # Ensure bucket exists
        bucket = settings.MINIO_BUCKET
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info(f"Created MinIO bucket: {bucket}")

        _minio_client = client
        logger.info(f"✅ Connected to MinIO at {settings.MINIO_ENDPOINT}")
        return _minio_client
    except Exception as e:
        logger.warning(f"MinIO unavailable ({e}), falling back to local filesystem")
        _use_local_fallback = True
        return None


# --- Local filesystem fallback ---

_LOCAL_STORAGE = Path(getattr(settings, "AUDIO_STORAGE_PATH", "./storage/audio"))
_LOCAL_STORAGE.mkdir(parents=True, exist_ok=True)


def _local_put(object_name: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    dest = _LOCAL_STORAGE / object_name
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return str(dest)


def _local_get(object_name: str) -> bytes:
    path = _LOCAL_STORAGE / object_name
    if not path.exists():
        raise FileNotFoundError(f"Object not found: {object_name}")
    return path.read_bytes()


def _local_delete(object_name: str):
    path = _LOCAL_STORAGE / object_name
    if path.exists():
        path.unlink()


def _local_presigned_url(object_name: str) -> str:
    # Can't generate real presigned URLs locally; return a file path
    return str(_LOCAL_STORAGE / object_name)


# --- Public API ---

class StorageService:
    """
    Unified storage interface. Uses MinIO when available, local FS otherwise.
    All paths (object_name) are relative keys like "sessions/abc123/chunk_001.wav".
    """

    def __init__(self):
        self._client = None
        self._initialized = False

    def _ensure_init(self):
        if not self._initialized:
            self._client = _get_minio_client()
            self._initialized = True

    def upload(
        self,
        object_name: str,
        data: bytes,
        content_type: str = "audio/wav",
    ) -> str:
        """
        Upload bytes to storage.
        Returns: the object_name (key) stored.
        """
        self._ensure_init()

        if _use_local_fallback or self._client is None:
            _local_put(object_name, data, content_type)
            logger.debug(f"[local] Uploaded {object_name} ({len(data)} bytes)")
            return object_name

        try:
            self._client.put_object(
                settings.MINIO_BUCKET,
                object_name,
                io.BytesIO(data),
                length=len(data),
                content_type=content_type,
            )
            logger.debug(f"[minio] Uploaded {object_name} ({len(data)} bytes)")
            return object_name
        except Exception as e:
            logger.error(f"MinIO upload failed, using local fallback: {e}")
            _local_put(object_name, data, content_type)
            return object_name

    def upload_file(
        self,
        object_name: str,
        file_path: str,
        content_type: str = "audio/wav",
    ) -> str:
        """Upload a local file to storage."""
        data = Path(file_path).read_bytes()
        return self.upload(object_name, data, content_type)

    def download(self, object_name: str) -> bytes:
        """Download bytes from storage."""
        self._ensure_init()

        if _use_local_fallback or self._client is None:
            return _local_get(object_name)

        try:
            response = self._client.get_object(settings.MINIO_BUCKET, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except Exception as e:
            logger.error(f"MinIO download failed, trying local: {e}")
            return _local_get(object_name)

    def get_presigned_url(
        self,
        object_name: str,
        expires: timedelta = timedelta(hours=1),
    ) -> str:
        """Generate a presigned download URL (MinIO only)."""
        self._ensure_init()

        if _use_local_fallback or self._client is None:
            return _local_presigned_url(object_name)

        try:
            url = self._client.presigned_get_object(
                settings.MINIO_BUCKET,
                object_name,
                expires=expires,
            )
            return url
        except Exception as e:
            logger.error(f"Presigned URL generation failed: {e}")
            return _local_presigned_url(object_name)

    def delete(self, object_name: str):
        """Delete an object from storage."""
        self._ensure_init()

        if _use_local_fallback or self._client is None:
            _local_delete(object_name)
            return

        try:
            self._client.remove_object(settings.MINIO_BUCKET, object_name)
            logger.debug(f"[minio] Deleted {object_name}")
        except Exception as e:
            logger.error(f"MinIO delete failed: {e}")
            _local_delete(object_name)

    def exists(self, object_name: str) -> bool:
        """Check if an object exists."""
        self._ensure_init()

        if _use_local_fallback or self._client is None:
            return (_LOCAL_STORAGE / object_name).exists()

        try:
            self._client.stat_object(settings.MINIO_BUCKET, object_name)
            return True
        except Exception:
            return False


# Singleton instance
storage = StorageService()
