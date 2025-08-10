"""Celery configuration and task definitions.

Defines background tasks for asynchronous processing:
- Product classification and data extraction
- Database operations
- Item enrichment workflows
"""

import logging
from typing import Dict, Any

from celery.app import Celery

from app.core.config import settings
from app.services.ai import ai_service
from app.services.database import database_service
from app.services.enrichment import enrichment_service
from app.core.utils.html_cleaner import clean_html_for_llm, extract_product_image_url

logger = logging.getLogger(__name__)

# Configure Celery application
celery = Celery(
    __name__, 
    broker=settings.REDIS_URL, 
    backend=settings.REDIS_URL,
    include=['app.celery']
)

# Alias for compatibility
app = celery

# Configure Celery settings
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    worker_prefetch_multiplier=1,
)

@app.task
def delete_item_task(item_id: str) -> Dict[str, Any]:
    """Delete item task for background processing.
    
    Args:
        item_id: ID of the item to delete
        
    Returns:
        Dict[str, Any]: Task result with status and details
    """
    try:
        logger.info(f"Starting delete task for item: {item_id}")
        database_service.delete_item(item_id)
        logger.info(f"Successfully deleted item: {item_id}")
        return {"status": "success", "item_id": item_id}
    except Exception as e:
        logger.error(f"Error deleting item {item_id}: {str(e)}")
        return {"status": "error", "item_id": item_id, "error": str(e)}

@app.task(autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 5})
def process_and_add_item_task(page_html: str, item_id: str) -> Dict[str, Any]:
    """Process and add item to wishlist with classification and enrichment.
    
    This task performs the complete item processing workflow:
    1. Clean and validate HTML content
    2. Extract product images
    3. Classify content as ecommerce product
    4. Extract structured product data
    5. Store in database
    6. Enrich with additional data
    
    Args:
        page_html: Raw HTML content from product page
        item_id: Unique identifier for the item
        
    Returns:
        Dict[str, Any]: Task result with status and details
    """
    try:
        logger.info(f"Starting processing task for item: {item_id}")
        
        # Validate inputs
        if not page_html or not page_html.strip():
            logger.error(f"Empty HTML content for item: {item_id}")
            return {"status": "error", "reason": "Empty HTML content", "item_id": item_id}
            
        if not item_id or not item_id.strip():
            logger.error("Empty item ID provided")
            return {"status": "error", "reason": "Empty item ID"}
        
        # Step 1: Clean HTML content for AI processing
        clean_text = clean_html_for_llm(page_html)
        if len(clean_text) > 40000:
            logger.warning(f"Truncating HTML content for {item_id} from {len(clean_text)} to 40000 chars")
            clean_text = clean_text[:40000]
        
        # Step 2: Extract product image URL
        image_url = extract_product_image_url(page_html)
        if image_url:
            logger.info(f"Extracted image URL for {item_id}: {image_url}")
    
        # Step 3: Classify content as ecommerce product
        logger.info(f"Classifying content for item: {item_id}")
        classification_response = ai_service.classify_item_sync(clean_text)
        
        if "error" in classification_response:
            logger.error(f"Classification failed for {item_id}: {classification_response['error']}")
            database_service.delete_item(item_id)
            return {
                "status": "error", 
                "reason": "Classification failed", 
                "details": classification_response["error"],
                "item_id": item_id
            }

        classification = classification_response["classification"]
        probability = classification.probability
        logger.info(f"Classification probability for {item_id}: {probability}")
        
        # Step 4: Check classification threshold
        if probability < 0.5:
            logger.info(f"Rejecting item {item_id} due to low classification probability: {probability}")
            database_service.delete_item(item_id)
            return {
                "status": "rejected", 
                "reason": "Low classification probability",
                "probability": probability,
                "item_id": item_id
            }

        # Step 5: Extract structured product data
        logger.info(f"Extracting product data for item: {item_id}")
        item_data = ai_service.process_item_sync(clean_text)
        
        if "error" in item_data:
            logger.error(f"Data extraction failed for {item_id}: {item_data['error']}")
            database_service.delete_item(item_id)
            return {
                "status": "error", 
                "reason": "Processing failed", 
                "details": item_data["error"],
                "item_id": item_id
            }
        
        # Step 6: Add extracted image URL to item data
        if image_url:
            item_data["image_url"] = image_url

        # Step 7: Store item in database
        logger.info(f"Storing item data for: {item_id}")
        database_service.add_item_sync(item_data, item_id)

        # Step 8: Enrich with detailed data (async, non-blocking)
        try:
            logger.info(f"Enriching item data for: {item_id}")
            enrichment_service.get_item_data_sync(clean_text, item_id)
        except Exception as e:
            # Don't fail the entire task if enrichment fails
            logger.warning(f"Enrichment failed for {item_id}, continuing: {str(e)}")

        logger.info(f"Successfully processed item: {item_id}")
        return {
            "status": "success", 
            "item_id": item_id,
            "classification_probability": probability,
            "has_image": bool(image_url)
        }
        
    except Exception as e:
        logger.error(f"Unexpected error processing item {item_id}: {str(e)}")
        # Attempt cleanup
        try:
            database_service.delete_item(item_id)
        except:
            logger.error(f"Failed to cleanup item {item_id} after error")
        return {
            "status": "error", 
            "reason": "Unexpected processing error", 
            "details": str(e),
            "item_id": item_id
        }