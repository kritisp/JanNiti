import json
import os
import random
from typing import List, Dict, Any

class DemoLoaderError(Exception):
    """Custom exception for Demo Data Loader errors."""
    pass

class DemoDataLoader:
    """Loads and validates demo citizen requests for JanNiti AI."""
    
    def __init__(self, filepath: str = None):
        if filepath is None:
            # Default to the citizen_requests.json in the same directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.filepath = os.path.join(current_dir, "citizen_requests.json")
        else:
            self.filepath = filepath
            
        self._data = None

    def _load_and_validate(self) -> List[Dict[str, Any]]:
        """Internal method to load and validate the JSON file."""
        if not os.path.exists(self.filepath):
            raise DemoLoaderError(f"Demo data file not found at {self.filepath}")
            
        try:
            with open(self.filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise DemoLoaderError(f"Invalid JSON format in demo data file: {e}")
        except Exception as e:
            raise DemoLoaderError(f"Failed to read demo data file: {e}")
            
        if not isinstance(data, list):
            raise DemoLoaderError("Demo data must be a JSON array of objects.")
            
        # Validate that each item is a dictionary with an 'id'
        for i, item in enumerate(data):
            if not isinstance(item, dict):
                raise DemoLoaderError(f"Invalid item at index {i}: Expected a JSON object.")
            if 'id' not in item:
                raise DemoLoaderError(f"Invalid item at index {i}: Missing required 'id' field.")
                
        return data

    def load_all(self) -> List[Dict[str, Any]]:
        """Returns all demo citizen requests."""
        if self._data is None:
            self._data = self._load_and_validate()
        return self._data

    def get_request(self, request_id: str) -> Dict[str, Any]:
        """Returns a single request by ID. Raises exception if not found."""
        data = self.load_all()
        for item in data:
            if item.get('id') == request_id:
                return item
        raise DemoLoaderError(f"Request with ID '{request_id}' not found.")

    def get_random(self) -> Dict[str, Any]:
        """Returns a random citizen request."""
        data = self.load_all()
        if not data:
            raise DemoLoaderError("Demo data file is empty.")
        return random.choice(data)

# Optional: Provide a singleton instance for easier imports
demo_loader = DemoDataLoader()
