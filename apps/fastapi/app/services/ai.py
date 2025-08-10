"""AI service module.

Provides AI-powered product classification and data extraction
using Azure OpenAI and LangChain integration.
"""

import logging
from typing import Dict, Any, List, Optional

from openai import AzureOpenAI
from langchain_openai import AzureChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import settings
from app.schemas.items import ItemSchema, ItemClassificationSchema

logger = logging.getLogger(__name__)

# Constants for AI processing
DISPLAY_WIDTH = 1280
DISPLAY_HEIGHT = 720
MAX_ITERATIONS = 50

# Key mapping for browser automation (if needed in future)
KEY_MAPPING = {
    "alt": "Alt", "arrowdown": "ArrowDown", "arrowleft": "ArrowLeft",
    "arrowright": "ArrowRight", "arrowup": "ArrowUp", "backspace": "Backspace",
    "ctrl": "Control", "delete": "Delete", "enter": "Enter", "esc": "Escape",
    "shift": "Shift", "space": " ", "tab": "Tab", "win": "Meta", "cmd": "Meta"
}

class AiService:
    """AI service for product classification and data extraction.
    
    This service uses Azure OpenAI and LangChain to:
    - Classify HTML content as ecommerce products
    - Extract structured product data from HTML
    - Process product images and content
    """
    
    def __init__(self):
        """Initialize AI service with Azure OpenAI clients."""
        try:
            self.llm: AzureChatOpenAI = AzureChatOpenAI(
                api_version="2024-12-01-preview",
                azure_deployment=settings.MODEL
            )
            self.cua: AzureOpenAI = AzureOpenAI(
                base_url=f"{settings.AZURE_OPENAI_ENDPOINT}/openai/v1/",
                api_version="preview",
                api_key=settings.AZURE_OPENAI_API_KEY,
            )
            self.last_screenshot: Optional[str] = None
            logger.info("AI service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AI service: {str(e)}")
            raise

    def classify_item_sync(self, html_content: str) -> Dict[str, Any]:
        """Classify HTML content as ecommerce product or not.
        
        Args:
            html_content: Raw HTML content to classify
            
        Returns:
            Dict containing classification result and confidence score
            
        Raises:
            ValueError: If html_content is empty or invalid
        """
        if not html_content or not html_content.strip():
            raise ValueError("HTML content cannot be empty")
            
        logger.debug(f"Classifying HTML content of length: {len(html_content)}")
        
        parser = JsonOutputParser(pydantic_object=ItemClassificationSchema)
        format_instructions = parser.get_format_instructions()

        system_message = SystemMessage(
            content=f"You are an expert ecommerce-data classification assistant.\n"
            f"Classify the provided HTML as either an ecommerce product or not.\n\n"
            f"You MUST extract the 'probability'.\n"
            f"{format_instructions}"
        )
        human_message = HumanMessage(
            content=f"Extract all relevant data from the following HTML:\n\n{html_content}"
        )
        messages = [system_message, human_message]

        try:
            response = self.llm.invoke(messages)
            classification_result = parser.parse(response.content)
            
            logger.info(f"Classification completed with probability: {classification_result.probability}")
            
            return {
                "classification": classification_result,
                "messages": messages + [response]
            }
        except Exception as e:
            logger.error(f"Error classifying item: {str(e)}")
            return {"error": str(e)}

    def process_item_sync(self, html_content: str, lite: bool = True) -> Dict[str, Any]:
        """Extract structured product data from HTML content.
        
        Args:
            html_content: Raw HTML content to process
            lite: If True, use structured ItemSchema; if False, extract freeform data
            
        Returns:
            Dict containing extracted product information
            
        Raises:
            ValueError: If html_content is empty or invalid
        """
        if not html_content or not html_content.strip():
            raise ValueError("HTML content cannot be empty")
            
        logger.debug(f"Processing item with lite={lite}, HTML length: {len(html_content)}")
        
        parser = JsonOutputParser(pydantic_object=ItemSchema if lite else None)
        format_instructions = parser.get_format_instructions()

        system_message = SystemMessage(
            content=f"You are an expert ecommerce-data extraction assistant.\n"
            f"Extract all relevant information from the provided HTML.\n\n"
            f"{format_instructions}"
        )
        human_message = HumanMessage(
            content=f"Extract all relevant data from the following HTML:\n\n{html_content}"
        )

        try:
            response = self.llm.invoke([system_message, human_message])
            result = parser.parse(response.content)
            logger.info("Successfully extracted product data")
            return result
        except Exception as e:
            logger.error(f"Error processing item: {str(e)}")
            return {"error": str(e)}

# Global AI service instance
ai_service = AiService()