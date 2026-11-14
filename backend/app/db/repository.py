"""One repository per process. Never silently replace existing data on DB errors."""
from copy import deepcopy
from threading import RLock
from typing import Any, Protocol

from pymongo import MongoClient
from pymongo.errors import PyMongoError

from app.core.config import Settings
from app.models.workflow import StorageStatus


class StorageUnavailable(Exception):
    pass


class Conflict(Exception):
    pass


class Repository(Protocol):
    status: StorageStatus
    def get(self, learner_id: str) -> dict[str, Any] | None: ...
    def create(self, document: dict[str, Any]) -> None: ...
    def save(self, document: dict[str, Any], expected_version: int) -> None: ...
    def close(self) -> None: ...


class MemoryRepository:
    def __init__(self, reason: str = "Temporary process-local storage; lost on restart and not shared across serverless instances"):
        self.status = StorageStatus(mode="memory", durable=False, reason=reason)
        self._documents: dict[str, dict[str, Any]] = {}
        self._lock = RLock()

    def get(self, learner_id: str):
        with self._lock:
            return deepcopy(self._documents.get(learner_id))

    def create(self, document):
        with self._lock:
            if document["_id"] in self._documents:
                raise Conflict()
            self._documents[document["_id"]] = deepcopy(document)

    def save(self, document, expected_version):
        with self._lock:
            previous = self._documents.get(document["_id"])
            if previous is None or previous["version"] != expected_version:
                raise Conflict()
            document = deepcopy(document)
            document["version"] = expected_version + 1
            self._documents[document["_id"]] = document

    def close(self):
        pass


class MongoRepository:
    status = StorageStatus(mode="mongodb", durable=True)

    def __init__(self, client, database):
        self.client = client
        self.collection = client[database]["learners"]

    def _healthy(self):
        self.status = StorageStatus(mode="mongodb", durable=True)

    def _unavailable(self, exc):
        self.status = StorageStatus(mode="unavailable", durable=False, reason=f"MongoDB operation failed ({type(exc).__name__}); existing database data was not replaced")

    def check_health(self):
        try:
            self.client.admin.command("ping")
            self._healthy()
        except PyMongoError as exc:
            self._unavailable(exc)
        return self.status

    def get(self, learner_id):
        try:
            document = self.collection.find_one({"_id": learner_id})
            self._healthy()
            return document
        except PyMongoError as exc:
            self._unavailable(exc)
            raise StorageUnavailable() from None

    def create(self, document):
        try:
            self.collection.insert_one(deepcopy(document))
            self._healthy()
        except PyMongoError as exc:
            self._unavailable(exc)
            raise StorageUnavailable() from None

    def save(self, document, expected_version):
        document = deepcopy(document)
        document["version"] = expected_version + 1
        try:
            result = self.collection.replace_one(
                {"_id": document["_id"], "version": expected_version}, document
            )
        except PyMongoError as exc:
            self._unavailable(exc)
            raise StorageUnavailable() from None
        self._healthy()
        if result.matched_count != 1:
            raise Conflict()

    def close(self):
        self.client.close()


class UnavailableRepository:
    def __init__(self, reason):
        self.status = StorageStatus(mode="unavailable", durable=False, reason=reason)

    def get(self, learner_id):
        raise StorageUnavailable()

    def create(self, document):
        raise StorageUnavailable()

    def save(self, document, expected_version):
        raise StorageUnavailable()

    def close(self):
        pass


def build_repository(settings: Settings) -> Repository:
    if settings.storage_backend == "memory":
        return MemoryRepository()
    client = None
    reason = "MongoDB URI is not configured"
    if settings.mongodb_uri.get_secret_value():
        try:
            client = MongoClient(
                settings.mongodb_uri.get_secret_value(),
                serverSelectionTimeoutMS=settings.mongodb_timeout_ms,
                connectTimeoutMS=settings.mongodb_timeout_ms,
                socketTimeoutMS=settings.mongodb_timeout_ms,
                maxPoolSize=10,
                minPoolSize=0,
                waitQueueTimeoutMS=settings.mongodb_timeout_ms,
            )
            client.admin.command("ping")
            return MongoRepository(client, settings.mongodb_database)
        except Exception as exc:
            # Record only the category; never log a connection string or user data.
            reason = f"MongoDB unavailable ({type(exc).__name__})"
            if client is not None:
                client.close()
    if settings.storage_backend == "auto" and settings.allow_memory_fallback:
        return MemoryRepository(reason + "; temporary process-local data is lost on restart and not shared across serverless instances")
    return UnavailableRepository(reason)
