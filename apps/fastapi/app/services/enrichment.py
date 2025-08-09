import logging

from typing import Dict, Any

from apify_client import ApifyClient
from googleapiclient.discovery import build

from app.core.config import settings

logger = logging.getLogger(__name__)

class EnrichmentService:
    def __init__(self):
        self.apify = ApifyClient(settings.APIFY_API_TOKEN)
        self.customsearch = build("customsearch", "v1", developerKey=settings.GOOGLE_API_KEY)

    def get_item_image_sync(self, item_data: Dict[str, Any]):
        search_query = f"{item_data['title']} {item_data['brand']} {item_data['category']}"
        
        search_response = self.customsearch.cse().list(
            q=search_query,
            searchType="image",
            cx=settings.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
        ).execute()
        
        if 'items' in search_response and search_response['items']:
            return search_response['items'][0]['link']
        return None
    
    def get_item_data_sync(self, html_content: str, item_id: str):
        from app.services.ai import ai_service
        from app.services.database import database_service
        
        if database_service.supabase is None:
            database_service.connect()
        
        item = ai_service.process_item_sync(html_content, False)
        response = database_service.supabase.table("products").upsert({"id": item_id, "details": item}).execute()
        return response.data

    def enrich_item_sync(self, item_data: Dict[str, Any]):
        search_query = f"{item_data['title']} {item_data['brand']} {item_data['category']}"
        
        run_input = {
            "queries": search_query,
            "resultsPerPage": 10,
            "maxPagesPerQuery": 1,
            "focusOnPaidAds": False,
            "searchLanguage": "",
            "languageCode": "",
            "forceExactMatch": False,
            "wordsInTitle": [],
            "wordsInText": [],
            "wordsInUrl": [],
            "mobileResults": False,
            "includeUnfilteredResults": False,
            "saveHtml": False,
            "saveHtmlToKeyValueStore": False,
            "includeIcons": False,
        }

        run = self.apify.actor("nFJndFXA5zjCTuudP").call(run_input=run_input)
        
        for item in self.apify.dataset(run["defaultDatasetId"]).iterate_items():
            print(item)
        return None

enrichment_service = EnrichmentService()