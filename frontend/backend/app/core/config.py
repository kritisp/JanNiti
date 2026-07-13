from typing import List, Union
from pydantic import BeforeValidator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Annotated


def parse_origins(v: Union[str, List[str]]) -> List[str]:
    """Parses a comma-separated string of origins into a list of strings."""
    if isinstance(v, str):
        return [item.strip() for item in v.split(",") if item.strip()]
    return v


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    SECRET_KEY: str
    DATABASE_URL: str
    GEMINI_API_KEY: str

    # Neo4j Graph Database Configurations
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    # Parse ALLOWED_ORIGINS dynamically from comma separated string or list
    ALLOWED_ORIGINS: Annotated[
        List[str], BeforeValidator(parse_origins)
    ] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT.lower() == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


# Initialize singleton settings instance
settings = Settings()
