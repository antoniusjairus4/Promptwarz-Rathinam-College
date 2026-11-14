"""Environment configuration; credentials are optional during setup."""
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    nvidia_api_key: SecretStr = SecretStr("")
    nvidia_model: str = ""
    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = ""
    openai_api_key: SecretStr = SecretStr("")
    openai_model: str = ""
    primary_llm_provider: Literal["nvidia", "gemini", "openai"] = "nvidia"
    mongodb_uri: SecretStr = SecretStr("")
    mongodb_database: str = "maximus"
    github_token: SecretStr = SecretStr("")
    youtube_api_key: SecretStr = SecretStr("")
    adzuna_app_id: str = ""
    adzuna_app_key: SecretStr = SecretStr("")
    storage_backend: Literal["auto", "memory", "mongodb"] = "auto"
    allow_memory_fallback: bool = True
    mongodb_timeout_ms: int = Field(default=3000, ge=100, le=10000)
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    llm_timeout_seconds: float = Field(default=45, ge=1, le=120)
    llm_max_tokens: int = Field(default=4096, ge=256, le=8192)
    himalayas_enabled: bool = True
    remotive_enabled: bool = True
    github_enabled: bool = True
    youtube_enabled: bool = True
    arbeitnow_enabled: bool = True
    adzuna_enabled: bool = True
    adzuna_country: Literal["in", "gb", "us", "au", "ca", "de", "fr", "nl", "nz", "pl", "sg", "za", "at", "br", "ch", "it"] = "in"
    external_timeout_seconds: float = Field(default=8, ge=1, le=20)
    external_cache_dir: Path = Path(__file__).resolve().parents[2] / ".cache"
    frontend_origin: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        """FRONTEND_ORIGIN accepts one origin or a comma-separated list."""
        return [origin.strip() for origin in self.frontend_origin.split(",") if origin.strip()]
