import os
import time
import logging
from typing import Dict, List, Any
from dotenv import load_dotenv
from sarvamai import SarvamAI

# Load configuration from .env
load_dotenv()

logger = logging.getLogger(__name__)

# Constants
SUPPORTED_LANGUAGES = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "od-IN": "Odia",
    "bn-IN": "Bengali"
}


class UnsupportedLanguageException(Exception):
    """Raised when an unsupported language is requested or detected."""
    pass


class SarvamAPIException(Exception):
    """Raised when the Sarvam API fails (e.g. 401, 403, 429, 500, timeouts)."""
    pass


class SarvamService:
    """
    Singleton class providing centralized multilingual capabilities using
    the official Sarvam AI Python SDK.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SarvamService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initializes the SDK exactly once."""
        api_key = os.environ.get("SARVAM_API_KEY")
        if not api_key:
            raise ValueError("Invalid API key: SARVAM_API_KEY environment variable is missing.")
            
        # Create client only once per application lifecycle
        if not hasattr(self, "_client") or self._client is None:
            self._client = SarvamAI(api_subscription_key=api_key)

    def _validate_language(self, language_code: str):
        """Ensures the language is strictly one of the 4 supported."""
        if not language_code:
            raise UnsupportedLanguageException("Language code cannot be empty.")
            
        # The SDK sometimes returns enum-like objects, ensure string comparison
        code_str = str(language_code)
        if code_str not in SUPPORTED_LANGUAGES:
            raise UnsupportedLanguageException(
                f"Unsupported language: '{code_str}'. "
                f"Only {list(SUPPORTED_LANGUAGES.keys())} are accepted."
            )

    def _execute_with_retry(self, func, *args, **kwargs):
        """
        Executes a callable with exponential backoff (retries up to 3 times).
        Handles 401, 403, 429, 500, network timeouts, and invalid API keys.
        """
        max_retries = 3
        base_delay = 1.0

        for attempt in range(max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                error_msg = str(e).lower()
                
                # Check for critical unrecoverable errors first
                if "401" in error_msg or "unauthorized" in error_msg or "invalid api key" in error_msg:
                    raise SarvamAPIException(f"Invalid API key or unauthorized (401): {e}")
                elif "403" in error_msg or "forbidden" in error_msg:
                    raise SarvamAPIException(f"Forbidden (403): {e}")
                elif "400" in error_msg or "invalid request" in error_msg:
                    raise SarvamAPIException(f"Invalid request (400): {e}")
                
                # If we've reached max retries, raise the exception
                if attempt == max_retries:
                    logger.error(f"[SarvamService] API call failed after {max_retries} retries. Error: {e}")
                    raise SarvamAPIException(f"API call failed: {e}")

                # Exponential backoff for 429, 500, timeouts, etc.
                delay = base_delay * (2 ** attempt)
                logger.warning(f"[SarvamService] Transient error encountered: {e}. Retrying in {delay}s...")
                time.sleep(delay)


    def detect_language(self, text: str) -> Dict[str, str]:
        """
        Detects the language of the provided text.
        Raises UnsupportedLanguageException if the language is not within the 4 supported.
        """
        if not text or not text.strip():
            raise ValueError("Invalid request: Text cannot be empty.")

        def _call_api():
            return self._client.text.identify_language(input=text)

        response = self._execute_with_retry(_call_api)
        
        # Validate and return
        code = response.language_code
        self._validate_language(code)
        
        return {
            "language": SUPPORTED_LANGUAGES[code],
            "code": code
        }

    def translate(self, text: str, source_language: str, target_language: str) -> Dict[str, str]:
        """
        Translates text from source to target. Both must be supported languages.
        """
        self._validate_language(source_language)
        self._validate_language(target_language)

        if not text or not text.strip():
            raise ValueError("Invalid request: Text cannot be empty.")

        def _call_api():
            return self._client.text.translate(
                input=text,
                source_language_code=source_language,
                target_language_code=target_language
            )

        response = self._execute_with_retry(_call_api)
        
        return {
            "translated_text": response.translated_text,
            "source_language": source_language,
            "target_language": target_language
        }

    def speech_to_text(self, audio_file: str) -> Dict[str, str]:
        """
        Transcribes the provided audio file. Raises UnsupportedLanguageException
        if the detected language is not one of the supported 4.
        """
        if not audio_file or not os.path.exists(audio_file):
            raise ValueError("Missing audio: File not found.")

        def _call_api():
            with open(audio_file, "rb") as f:
                return self._client.speech_to_text.transcribe(file=f)

        response = self._execute_with_retry(_call_api)
        
        code = response.language_code
        self._validate_language(code)
        
        return {
            "text": response.transcript,
            "language": code
        }

    def speech_to_text_translate(self, audio_file: str, target_language: str = "en-IN") -> Dict[str, str]:
        """
        Translates speech directly to text. Target language defaults to English.
        """
        self._validate_language(target_language)

        if not audio_file or not os.path.exists(audio_file):
            raise ValueError("Missing audio: File not found.")

        def _call_api():
            with open(audio_file, "rb") as f:
                return self._client.speech_to_text.translate(file=f)

        response = self._execute_with_retry(_call_api)
        
        code = response.language_code
        self._validate_language(code)
        
        return {
            "original_language": code,
            "translated_text": response.transcript
        }

    def text_to_speech(self, text: str, language: str) -> str:
        """
        Converts text to speech for the given language.
        Returns the generated audio base64 bytes/string.
        """
        self._validate_language(language)

        if not text or not text.strip():
            raise ValueError("Invalid request: Text cannot be empty.")

        def _call_api():
            return self._client.text_to_speech.convert(
                text=text,
                target_language_code=language
            )

        response = self._execute_with_retry(_call_api)
        
        if not response.audios:
            raise SarvamAPIException("Text to speech API returned empty audio list.")
            
        # Return the base64 encoded audio string
        return response.audios[0]

    def chat(self, messages: List[Dict[str, str]]) -> str:
        """
        Chats with Sarvam-105b using the given message history.
        """
        if not messages:
            raise ValueError("Invalid request: Messages cannot be empty.")

        def _call_api():
            return self._client.chat.completions(
                model="sarvam-105b",
                max_tokens=4096,
                reasoning_effort=None,
                messages=messages
            )

        response = self._execute_with_retry(_call_api)
        
        if not response.choices:
            raise SarvamAPIException("Chat API returned no choices.")
            
        return response.choices[0].message.content
