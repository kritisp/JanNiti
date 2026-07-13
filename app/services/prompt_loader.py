import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class PromptLoader:
    """
    Utility class for loading, caching, and formatting prompt templates.
    """
    _cache: Dict[str, str] = {}
    
    # Resolving path relative to this file's location: app/services/prompt_loader.py -> app/prompts
    _base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'prompts'))

    @classmethod
    def get_prompt(cls, filename: str, **kwargs: Any) -> str:
        """
        Loads a prompt template by filename, replaces placeholders with provided kwargs,
        and returns the formatted string.
        
        Args:
            filename: The name of the file in the app/prompts directory (e.g., 'citizen_intelligence.txt')
            **kwargs: Key-value pairs to replace in the prompt template using standard Python string formatting.
            
        Returns:
            The final formatted prompt string.
        """
        template = cls._load_template(filename)
        try:
            return template.format(**kwargs)
        except KeyError as e:
            logger.error(f"Missing required format variable {e} for prompt {filename}")
            raise ValueError(f"Missing variable {e} for prompt template {filename}")
        except Exception as e:
            logger.error(f"Error formatting prompt {filename}: {str(e)}")
            raise

    @classmethod
    def _load_template(cls, filename: str) -> str:
        """
        Loads the template from the cache or reads it from the filesystem.
        """
        if filename in cls._cache:
            return cls._cache[filename]
            
        filepath = os.path.join(cls._base_dir, filename)
        
        if not os.path.exists(filepath):
            logger.error(f"Prompt file not found: {filepath}")
            raise FileNotFoundError(f"Prompt template '{filename}' does not exist at {filepath}")
            
        with open(filepath, 'r', encoding='utf-8') as f:
            template_content = f.read()
            
        # Cache the file content
        cls._cache[filename] = template_content
        logger.debug(f"Loaded and cached prompt template: {filename}")
        
        return template_content

    @classmethod
    def clear_cache(cls):
        """Clears the prompt cache."""
        cls._cache.clear()
        logger.info("Prompt cache cleared.")
