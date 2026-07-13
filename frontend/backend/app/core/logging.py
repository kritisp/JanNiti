import logging
import logging.config
import sys
from typing import Any, Dict

from app.core.config import settings


def configure_logging() -> None:
    """Configures structured console logging for the application.

    Ensures that uvicorn logs, database query warnings, and application-level log
    statements are properly captured and formatted according to the current
    environment.
    """
    log_level = "DEBUG" if settings.is_development else "INFO"

    # Define a clean logging configuration schema
    logging_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": "[%(asctime)s] %(levelname)s [%(name)s] [%(filename)s:%(lineno)d] - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "simple": {
                "format": "%(asctime)s - %(levelname)s - %(message)s",
                "datefmt": "%H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": "standard",
                "level": log_level,
            },
        },
        "root": {
            "handlers": ["console"],
            "level": log_level,
        },
        "loggers": {
            "app": {
                "handlers": ["console"],
                "level": log_level,
                "propagate": False,
            },
            "uvicorn": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "uvicorn.error": {
                "level": "INFO",
                "propagate": True,
            },
            "uvicorn.access": {
                "handlers": ["console"],
                "level": "INFO",
                "propagate": False,
            },
            "sqlalchemy.engine": {
                "handlers": ["console"],
                "level": "WARNING",  # Set to INFO to log all SQL queries in dev if needed
                "propagate": False,
            },
        },
    }

    logging.config.dictConfig(logging_config)


# Package-level helper to obtain active app logger
logger = logging.getLogger("app")
