from dotenv import load_dotenv

from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

class Settings(BaseSettings):
    ALLOWED_EXTENSION_ID: str
    APIFY_API_TOKEN: str
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_ENDPOINT: str
    APP_ENV: str = "dev"
    GOOGLE_API_KEY: str
    GOOGLE_CUSTOM_SEARCH_ENGINE_ID: str
    LANGSMITH_API_KEY: str
    LANGSMITH_PROJECT: str
    LANGSMITH_TRACING: bool = True
    MODEL: str
    PORT: int = 8000
    REDIS_URL: str = "redis://localhost:6379"
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    model_config = SettingsConfigDict(env_file=".env", extra='ignore')

settings = Settings()