import logging


from openai import AzureOpenAI
from langchain_openai import AzureChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import settings
from app.schemas.items import ItemSchema,ItemClassificationSchema

logger = logging.getLogger(__name__)

DISPLAY_WIDTH = 1280
DISPLAY_HEIGHT = 720
MAX_ITERATIONS = 50

KEY_MAPPING = {
    "alt": "Alt", "arrowdown": "ArrowDown", "arrowleft": "ArrowLeft",
    "arrowright": "ArrowRight", "arrowup": "ArrowUp", "backspace": "Backspace",
    "ctrl": "Control", "delete": "Delete", "enter": "Enter", "esc": "Escape",
    "shift": "Shift", "space": " ", "tab": "Tab", "win": "Meta", "cmd": "Meta"
}

class AiService:
    def __init__(self):
        self.llm: AzureChatOpenAI = AzureChatOpenAI(
            api_version="2024-12-01-preview",
            azure_deployment=settings.MODEL
        )
        self.cua: AzureOpenAI = AzureOpenAI(
            base_url=f"{settings.AZURE_OPENAI_ENDPOINT}/openai/v1/",
            api_version="preview",
            api_key=settings.AZURE_OPENAI_API_KEY,
        )
        self.last_screenshot = None

    def classify_item_sync(self, html_content: str):
        parser = JsonOutputParser(pydantic_object=ItemClassificationSchema)
        format_instructions = parser.get_format_instructions()

        system_message = SystemMessage(
            content=f"You are an expert ecommerce-data classification assistant.\n"
            f"Classify the provided HTML as either an ecommerce product or not.\n\n"
            f"You MUST extract the 'probability'.\n"
            f"{format_instructions}"
        )
        human_message = HumanMessage(content=f"Extract all relevant data from the following HTML:\n\n{html_content}")
        messages = [system_message, human_message]

        try:
            response = self.llm.invoke(messages)
            classification_result = parser.parse(response.content)
            
            return {
                "classification": classification_result,
                "messages": messages + [response]
            }
        except Exception as e:
            logger.error("Error processing wishlist item: %s", e)
            return {"error": str(e)}

    def process_item_sync(self, html_content: str, lite: bool = True):
        parser = JsonOutputParser(pydantic_object=ItemSchema if lite else None)
        format_instructions = parser.get_format_instructions()

        system_message = SystemMessage(
            content=f"You are an expert ecommerce-data extraction assistant.\n"
            f"Extract all relevant information from the provided HTML.\n\n"
            f"{format_instructions}"
        )
        human_message = HumanMessage(content=f"Extract all relevant data from the following HTML:\n\n{html_content}")

        try:
            response = self.llm.invoke([system_message, human_message])
            return parser.parse(response.content)
        except Exception as e:
            logger.error("Error processing wishlist item: %s", e)
            return {"error": str(e)}

ai_service = AiService()