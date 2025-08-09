import logging
from typing import Any, Dict

from supabase import create_client, Client

from app.core.config import settings
from app.core.utils.url_validator import validate_image_url_sync

logger = logging.getLogger(__name__)

def get_supabase_client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

class DatabaseService:
    def __init__(self):
        self.supabase: Client | None = None

    def connect(self):
        self.supabase = get_supabase_client()

    def get_user(self, jwt_token: str):
        if self.supabase is None:
            self.connect()
        
        response = self.supabase.auth.get_user(jwt_token)
        return response.user

    def add_item_sync(self, item: Dict[str, Any], item_id: str):
        if self.supabase is None:
            self.connect()

        product_data = { "title": item.get("title"), "category": item.get("category") }
        for field in ["brand", "description"]:
            if field in item:
                product_data[field] = item[field]

        image_url = item.get("image_url")
        if image_url:
            if validate_image_url_sync(image_url):
                product_data["image_url"] = image_url
            else:
                from app.services.enrichment import enrichment_service
                fallback_image_url = enrichment_service.get_item_image_sync(item)
                if fallback_image_url:
                    product_data["image_url"] = fallback_image_url

        response = self.supabase.table("products").upsert({**product_data, "id": item_id}).execute()

        if "price" in item:
            price_data = {
                "product_id": item_id,
                "amount": item["price"],
                "currency": item["currency"],
                "source_url": response.data[0].get("source_url"),
            }
            self.supabase.table("prices").insert(price_data).execute()

        logger.info(f"Added or updated product and added price for item: {item_id}")

    def delete_item(self, item_id: str):
        if self.supabase is None:
            self.connect()
        
        self.supabase.table("products").delete().eq("id", item_id).execute()
        logger.info(f"Deleted product with item_id: {item_id}")


database_service = DatabaseService()