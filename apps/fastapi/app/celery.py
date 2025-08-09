from celery.app import Celery

from app.core.config import settings
from app.services.ai import ai_service
from app.services.database import database_service
from app.services.enrichment import enrichment_service
from app.core.utils.html_cleaner import clean_html_for_llm, extract_product_image_url

app = Celery(__name__, broker=settings.REDIS_URL, backend=settings.REDIS_URL)

@app.task
def delete_item_task(item_id: str):
    return database_service.delete_item(item_id)

@app.task(autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 5})
def process_and_add_item_task(page_html: str, item_id: str):
    clean_text = clean_html_for_llm(page_html)
    image_url = extract_product_image_url(page_html)

    if len(clean_text) > 40000:
        clean_text = clean_text[:40000]
    
    classification_response = ai_service.classify_item_sync(clean_text)
    if "error" in classification_response:
        database_service.delete_item(item_id)
        return {"status": "error", "reason": "Classification failed", "details": classification_response["error"]}

    classification = classification_response["classification"]
    
    if classification['probability'] < 0.5:
        database_service.delete_item(item_id)
        return {"status": "rejected", "reason": "Low classification probability"}

    item_data = ai_service.process_item_sync(clean_text)
    if "error" in item_data:
        database_service.delete_item(item_id)
        return {"status": "error", "reason": "Processing failed", "details": item_data["error"]}
        
    if image_url:
        item_data["image_url"] = image_url

    database_service.add_item_sync(item_data, item_id)

    enrichment_service.get_item_data_sync(clean_text, item_id)

    return {"status": "success", "item_id": item_id}