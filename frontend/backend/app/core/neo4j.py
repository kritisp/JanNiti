import logging
from typing import Optional

from neo4j import GraphDatabase, Driver

from app.core.config import settings

logger = logging.getLogger("app")


class Neo4jManager:
    """Singleton coordinator for the Neo4j driver connection lifecycle."""

    _instance: Optional["Neo4jManager"] = None
    _driver: Optional[Driver] = None

    def __new__(cls) -> "Neo4jManager":
        if cls._instance is None:
            cls._instance = super(Neo4jManager, cls).__new__(cls)
        return cls._instance

    def connect(self) -> None:
        """Initializes and caches the Graph driver using settings environment.

        Raises:
            Exception: If connectivity validation fails.
        """
        if self._driver is not None:
            return

        try:
            logger.info(f"Connecting to Neo4j database at {settings.NEO4J_URI}...")
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD),
            )
            # Perform immediate ping verification
            self._driver.verify_connectivity()
            logger.info("Neo4j database connection established successfully.")
        except Exception as e:
            logger.error(f"Failed to verify connectivity to Neo4j: {str(e)}")
            self._driver = None
            raise e

    def get_driver(self) -> Driver:
        """Gets the active driver instance, connecting if not already established."""
        if self._driver is None:
            self.connect()
        return self._driver

    def close(self) -> None:
        """Safely closes the Neo4j database driver connection pool."""
        if self._driver is not None:
            logger.info("Closing Neo4j database driver connection...")
            self._driver.close()
            self._driver = None
            logger.info("Neo4j database connection closed.")

    def verify_health(self) -> bool:
        """Performs a lightweight query to verify the connection pool health.

        Returns:
            bool: True if connection is responsive, False otherwise.
        """
        try:
            if self._driver is None:
                self.connect()
            else:
                self._driver.verify_connectivity()
            return True
        except Exception as e:
            logger.warning(
                f"Neo4j connectivity check failed: {str(e)}. Resetting connection pool."
            )
            self._driver = None
            return False


# Singleton registry instance
neo4j_manager = Neo4jManager()
