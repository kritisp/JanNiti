import os
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class KnowledgeLoader:
    """
    Utility class for loading, caching, and querying constituency knowledge base JSON files.
    """
    _cache: Dict[str, Any] = {}
    
    # Resolving path relative to this file's location: app/services/knowledge_loader.py -> app/knowledge
    _base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'knowledge'))

    @classmethod
    def _load_json(cls, filename: str) -> Any:
        """Loads and parses a JSON file, caching the result in memory."""
        if filename in cls._cache:
            return cls._cache[filename]
            
        filepath = os.path.join(cls._base_dir, filename)
        if not os.path.exists(filepath):
            logger.error(f"Knowledge base file not found: {filepath}")
            raise FileNotFoundError(f"Knowledge base file '{filename}' does not exist at {filepath}")
            
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        cls._cache[filename] = data
        logger.debug(f"Loaded and cached knowledge base: {filename}")
        
        return data

    @classmethod
    def get_constituency_data(cls) -> Dict[str, Any]:
        """Returns the general constituency data."""
        return cls._load_json("constituency.json")

    @classmethod
    def get_departments(cls) -> List[Dict[str, Any]]:
        """Returns all government departments."""
        return cls._load_json("departments.json")

    @classmethod
    def get_department_by_id(cls, dept_id: str) -> Optional[Dict[str, Any]]:
        """Finds a specific department by its ID."""
        departments = cls.get_departments()
        for dept in departments:
            if dept.get("department_id") == dept_id:
                return dept
        return None

    @classmethod
    def get_development_projects(cls) -> List[Dict[str, Any]]:
        """Returns all development projects."""
        return cls._load_json("development_projects.json")

    @classmethod
    def get_projects_by_department(cls, dept_id: str) -> List[Dict[str, Any]]:
        """Returns development projects belonging to a specific department."""
        projects = cls.get_development_projects()
        return [p for p in projects if p.get("department_id") == dept_id]

    @classmethod
    def get_budgets(cls) -> Dict[str, Any]:
        """Returns the full budget data."""
        return cls._load_json("budgets.json")
        
    @classmethod
    def get_department_budget(cls, dept_id: str) -> Optional[Dict[str, Any]]:
        """Returns the budget allocation for a specific department."""
        budgets = cls.get_budgets()
        allocations = budgets.get("allocations", {})
        return allocations.get(dept_id)

    @classmethod
    def clear_cache(cls):
        """Clears the knowledge base cache."""
        cls._cache.clear()
        logger.info("Knowledge base cache cleared.")
