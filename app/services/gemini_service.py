import os
import json
import logging
from typing import Any, Dict, List, Optional
import google.generativeai as genai
from google.api_core.exceptions import GoogleAPIError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Configure logging
logger = logging.getLogger(__name__)

class GeminiService:
    """
    Singleton service for interacting with the Google Gemini API.
    Handles retries, timeouts, JSON parsing, and logging.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GeminiService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initialize the Gemini client using environment variables."""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY environment variable is not set. API calls will fail.")
        
        genai.configure(api_key=api_key)
        
        # Default model for general text tasks
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((GoogleAPIError, TimeoutError)),
        reraise=True
    )
    async def generate(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """
        Generic method to generate text based on a prompt.
        """
        logger.info("Calling Gemini API: generate")
        try:
            # Note: For Gemini 1.5, system instructions can be set on model initialization
            # but for this generic method we'll pass it if needed by creating a specific model instance.
            model = self.model
            if system_instruction:
                model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=system_instruction)
            
            response = await model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API failure in generate: {str(e)}")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((GoogleAPIError, TimeoutError, ValueError)),
        reraise=True
    )
    async def generate_json(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        """
        Generates structured JSON output. Enforces JSON parsing and handles invalid JSON.
        """
        logger.info("Calling Gemini API: generate_json")
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            if system_instruction:
                model = genai.GenerativeModel('gemini-2.5-flash', system_instruction=system_instruction)
            
            # Requesting JSON response format
            response = await model.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(response_mime_type="application/json")
            )
            
            text_response = response.text
            try:
                # Attempt to parse the response as JSON
                return json.loads(text_response)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON received from Gemini API: {text_response}")
                # Raising ValueError to trigger tenacity retry
                raise ValueError(f"Failed to parse JSON response: {str(e)}")
                
        except Exception as e:
            logger.error(f"Gemini API failure in generate_json: {str(e)}")
            raise

    async def translate(self, text: str, target_language: str) -> str:
        """
        Translates text to the specified target language.
        """
        prompt = f"Translate the following text to {target_language}. Return ONLY the translation, nothing else:\n\n{text}"
        return await self.generate(prompt)

    async def classify(self, text: str, categories: List[str]) -> str:
        """
        Classifies the text into one of the provided categories.
        """
        categories_str = ", ".join(categories)
        prompt = (
            f"Classify the following text into exactly ONE of these categories: {categories_str}.\n"
            f"Return ONLY the category name.\n\n"
            f"Text: {text}"
        )
        return await self.generate(prompt)

    async def summarize(self, text: str, max_sentences: int = 3) -> str:
        """
        Summarizes the text into a specified number of sentences.
        """
        prompt = f"Summarize the following text in at most {max_sentences} sentences:\n\n{text}"
        return await self.generate(prompt)

    async def extract_entities(self, text: str, entity_types: List[str]) -> Dict[str, List[str]]:
        """
        Extracts specific entities from the text and returns them as a structured JSON object.
        """
        types_str = ", ".join(entity_types)
        system_instruction = (
            f"You are an entity extraction system. Extract entities of the following types: {types_str}. "
            f"Return a valid JSON object where keys are the entity types and values are lists of extracted strings."
        )
        prompt = f"Extract entities from this text:\n\n{text}"
        
        return await self.generate_json(prompt, system_instruction=system_instruction)
