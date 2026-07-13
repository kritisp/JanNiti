import os
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class KnowledgeLoader:
    """
    Utility class for loading, caching, and querying knowledge base JSON files.
    """
    _cache: Dict[str, Any] = {}
    
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
    def get_departments(cls) -> List[Dict[str, Any]]:
        return cls._load_json("departments.json")

    @classmethod
    def get_government_schemes(cls) -> List[Dict[str, Any]]:
        return cls._load_json("government_schemes.json")

    @classmethod
    def get_issue_categories(cls) -> List[Dict[str, Any]]:
        return cls._load_json("issue_categories.json")

    @classmethod
    def get_priority_rules(cls) -> List[Dict[str, Any]]:
        return cls._load_json("priority_rules.json")

    @classmethod
    def get_budget_ranges(cls) -> List[Dict[str, Any]]:
        return cls._load_json("budget_ranges.json")

    @classmethod
    def get_constituency_profiles(cls) -> List[Dict[str, Any]]:
        return cls._load_json("constituency_profiles.json")

    @classmethod
    def get_demographic_reference(cls) -> Dict[str, Any]:
        return cls._load_json("demographic_reference.json")

    @classmethod
    def get_infrastructure_reference(cls) -> Dict[str, Any]:
        return cls._load_json("infrastructure_reference.json")

    @classmethod
    def get_sdg_mapping(cls) -> List[Dict[str, Any]]:
        return cls._load_json("sdg_mapping.json")

    @classmethod
    def clear_cache(cls):
        """Clears the knowledge base cache."""
        cls._cache.clear()
        logger.info("Knowledge base cache cleared.")
