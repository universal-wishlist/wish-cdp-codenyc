"""Enrichment service module.

Provides product data enrichment through external APIs:
- Google Custom Search for product images
- Apify for competitor research and pricing data
- AI-powered product data enhancement
"""

import logging
from typing import Dict, Any, Optional, List

from apify_client import ApifyClient
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.core.config import settings

logger = logging.getLogger(__name__)

class EnrichmentService:
    """Service for enriching product data with external APIs.
    
    Uses Google Custom Search and Apify to enhance product information
    with images, pricing data, and competitor analysis.
    """
    
    def __init__(self):
        """Initialize enrichment service with API clients.
        
        Raises:
            Exception: If API client initialization fails
        """
        try:
            self.apify = ApifyClient(settings.APIFY_API_TOKEN)
            self.customsearch = build(
                "customsearch", 
                "v1", 
                developerKey=settings.GOOGLE_API_KEY
            )
            logger.info("Enrichment service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize enrichment service: {str(e)}")
            raise

    def get_item_image_sync(self, item_data: Dict[str, Any]) -> Optional[str]:
        """Get product image URL using Google Custom Search.
        
        Args:
            item_data: Product data dictionary with title, brand, category
            
        Returns:
            Optional[str]: Image URL if found, None otherwise
            
        Raises:
            ValueError: If required fields are missing
        """
        # Validate required fields
        if not item_data.get('title'):
            raise ValueError("Product title is required")
            
        # Build search query from available data
        query_parts = [item_data['title']]
        if item_data.get('brand'):
            query_parts.append(item_data['brand'])
        if item_data.get('category'):
            query_parts.append(item_data['category'])
            
        search_query = " ".join(query_parts)
        logger.info(f"Searching for product image: {search_query}")
        
        try:
            search_response = self.customsearch.cse().list(
                q=search_query,
                searchType="image",
                cx=settings.GOOGLE_CUSTOM_SEARCH_ENGINE_ID,
                num=3,  # Get multiple results for better selection
                safe="active",
                imgType="photo"
            ).execute()
            
            if 'items' in search_response and search_response['items']:
                # Return the first valid image URL
                image_url = search_response['items'][0]['link']
                logger.info(f"Found image URL: {image_url}")
                return image_url
            else:
                logger.warning(f"No images found for query: {search_query}")
                return None
                
        except HttpError as e:
            logger.error(f"Google API error searching for image: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error searching for product image: {str(e)}")
            return None
    
    def get_item_data_sync(self, html_content: str, item_id: str) -> List[Dict[str, Any]]:
        """Extract and store detailed product data from HTML.
        
        Args:
            html_content: Raw HTML content to process
            item_id: Unique identifier for the product
            
        Returns:
            List[Dict[str, Any]]: Database response data
            
        Raises:
            ValueError: If parameters are invalid
            Exception: If processing or storage fails
        """
        if not html_content or not html_content.strip():
            raise ValueError("HTML content cannot be empty")
        if not item_id or not item_id.strip():
            raise ValueError("Item ID cannot be empty")
            
        logger.info(f"Processing detailed item data for: {item_id}")
        
        try:
            from app.services.ai import ai_service
            from app.services.database import database_service
            
            # Ensure database connection
            if database_service.supabase is None:
                database_service.connect()
            
            # Extract detailed item data (non-lite mode)
            item = ai_service.process_item_sync(html_content, lite=False)
            
            if "error" in item:
                logger.error(f"AI processing error for {item_id}: {item['error']}")
                raise Exception(f"AI processing failed: {item['error']}")
            
            # Store detailed data
            response = database_service.supabase.table("products").upsert({
                "id": item_id, 
                "details": item
            }).execute()
            
            logger.info(f"Successfully stored detailed data for: {item_id}")
            return response.data
            
        except Exception as e:
            logger.error(f"Error processing item data for {item_id}: {str(e)}")
            raise

    def enrich_item_sync(self, item_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Enrich product data using Apify Google Search scraper.
        
        Args:
            item_data: Product data dictionary
            
        Returns:
            Optional[Dict[str, Any]]: Enriched product data or None if failed
            
        Raises:
            ValueError: If required fields are missing
        """
        if not item_data.get('title'):
            raise ValueError("Product title is required")
            
        # Build search query
        query_parts = [item_data['title']]
        if item_data.get('brand'):
            query_parts.append(item_data['brand'])
        if item_data.get('category'):
            query_parts.append(item_data['category'])
            
        search_query = " ".join(query_parts)
        logger.info(f"Enriching item data with query: {search_query}")
        
        try:
            run_input = {
                "queries": search_query,
                "resultsPerPage": 10,
                "maxPagesPerQuery": 1,
                "focusOnPaidAds": False,
                "searchLanguage": "en",
                "languageCode": "en",
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

            # Run Apify actor
            run = self.apify.actor("nFJndFXA5zjCTuudP").call(run_input=run_input)
            
            enriched_data = []
            for item in self.apify.dataset(run["defaultDatasetId"]).iterate_items():
                logger.debug(f"Apify result: {item}")
                enriched_data.append(item)
            
            if enriched_data:
                logger.info(f"Successfully enriched item with {len(enriched_data)} results")
                return {"search_results": enriched_data, "query": search_query}
            else:
                logger.warning(f"No enrichment data found for: {search_query}")
                return None
                
        except Exception as e:
            logger.error(f"Error enriching item data: {str(e)}")
            return None

# Global enrichment service instance
enrichment_service = EnrichmentService()