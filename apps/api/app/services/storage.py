from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
import re
from typing import Protocol
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings


@dataclass(frozen=True)
class StagedObject:
    path: Path
    filename: str
    suffix: str
    checksum: str
    size_bytes: int


@dataclass(frozen=True)
class StoredObject:
    key: str
    uri: str


class ObjectStorage(Protocol):
    async def stage(self, upload: UploadFile) -> StagedObject: ...

    def promote(self, staged: StagedObject) -> StoredObject: ...

    def delete(self, stored: StoredObject) -> None: ...

    def discard(self, staged: StagedObject) -> None: ...

    def materialize(self, uri: str) -> Path: ...

    def store_bytes(self, content: bytes, suffix: str) -> StoredObject: ...


class LocalObjectStorage:
    """Filesystem-backed object storage for development and test environments."""

    chunk_size = 1024 * 1024

    def __init__(self, root: str, max_upload_bytes: int) -> None:
        self.root = Path(root).resolve()
        self.staging_root = self.root / "staging"
        self.objects_root = self.root / "objects"
        self.max_upload_bytes = max_upload_bytes
        self.staging_root.mkdir(parents=True, exist_ok=True)
        self.objects_root.mkdir(parents=True, exist_ok=True)

    async def stage(self, upload: UploadFile) -> StagedObject:
        filename = sanitize_filename(upload.filename)
        suffix = Path(filename).suffix.lower()
        temporary_path = self._safe_path(self.staging_root / f"{uuid4()}{suffix}")
        digest = sha256()
        size_bytes = 0

        try:
            with temporary_path.open("xb") as destination:
                while chunk := await upload.read(self.chunk_size):
                    size_bytes += len(chunk)
                    if size_bytes > self.max_upload_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                            detail=f"File exceeds the {self.max_upload_bytes} byte upload limit",
                        )
                    digest.update(chunk)
                    destination.write(chunk)
        except Exception:
            temporary_path.unlink(missing_ok=True)
            raise
        finally:
            await upload.close()

        return StagedObject(
            path=temporary_path,
            filename=filename,
            suffix=suffix,
            checksum=digest.hexdigest(),
            size_bytes=size_bytes,
        )

    def promote(self, staged: StagedObject) -> StoredObject:
        key = f"objects/{uuid4()}{staged.suffix}"
        destination = self._safe_path(self.root / key)
        staged.path.replace(destination)
        return StoredObject(key=key, uri=f"local://{key}")

    def discard(self, staged: StagedObject) -> None:
        staged.path.unlink(missing_ok=True)

    def delete(self, stored: StoredObject) -> None:
        self._safe_path(self.root / stored.key).unlink(missing_ok=True)

    def materialize(self, uri: str) -> Path:
        prefix = "local://"
        if not uri.startswith(prefix):
            raise ValueError("Local storage cannot materialize a non-local object URI")
        return self._safe_path(self.root / uri.removeprefix(prefix))

    def store_bytes(self, content: bytes, suffix: str) -> StoredObject:
        normalized_suffix = suffix if suffix.startswith(".") else f".{suffix}"
        key = f"objects/{uuid4()}{normalized_suffix}"
        destination = self._safe_path(self.root / key)
        with destination.open("xb") as output:
            output.write(content)
        return StoredObject(key=key, uri=f"local://{key}")

    def _safe_path(self, path: Path) -> Path:
        resolved = path.resolve()
        if not resolved.is_relative_to(self.root):
            raise ValueError("storage path escaped the configured root")
        return resolved


def sanitize_filename(filename: str | None) -> str:
    name = Path(filename or "upload").name
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name).strip("._")
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid filename")
    return name


def get_object_storage() -> ObjectStorage:
    settings = get_settings()
    return LocalObjectStorage(settings.local_storage_path, settings.max_upload_bytes)
