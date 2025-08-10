"""Database service module.

Handles Supabase database operations for user authentication,
product data storage, and price tracking.
"""

import logging
from typing import Any, Dict, Optional

from supabase import create_client, Client
from gotrue.types import User

from app.core.config import settings
from app.core.utils.url_validator import validate_image_url_sync

logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    """Create and return a Supabase client instance.
    
    Returns:
        Client: Configured Supabase client
    """
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

class DatabaseService:
    """Database service for Supabase operations.
    
    Manages connections to Supabase and provides methods for:
    - User authentication
    - Product data storage and retrieval
    - Price tracking and history
    """
    
    def __init__(self):
        """Initialize database service with lazy connection."""
        self.supabase: Optional[Client] = None
        logger.info("Database service initialized")

    def connect(self) -> None:
        """Establish connection to Supabase.
        
        Raises:
            Exception: If connection fails
        """
        try:
            self.supabase = get_supabase_client()
            logger.info("Successfully connected to Supabase")
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {str(e)}")
            raise

    def get_user(self, jwt_token: str) -> Optional[User]:
        """Get user information from JWT token.
        
        Args:
            jwt_token: JWT token for authentication
            
        Returns:
            Optional[User]: User object if token is valid, None otherwise
            
        Raises:
            Exception: If database connection or query fails
        """
        if self.supabase is None:
            self.connect()
        
        try:
            logger.debug(f"Fetching user for token: {jwt_token[:8]}...")
            response = self.supabase.auth.get_user(jwt_token)
            
            if response.user:
                logger.info(f"Successfully retrieved user: {response.user.id}")
            else:
                logger.warning("No user found for provided token")
                
            return response.user
        except Exception as e:
            logger.error(f"Error retrieving user: {str(e)}")
            raise

    def add_item_sync(self, item: Dict[str, Any], item_id: str) -> None:
        """Add or update product item in database.
        
        Args:
            item: Product data dictionary
            item_id: Unique identifier for the product
            
        Raises:
            ValueError: If required fields are missing
            Exception: If database operations fail
        """
        if self.supabase is None:
            self.connect()

        # Validate required fields
        if not item.get("title"):
            raise ValueError("Product title is required")
        if not item.get("category"):
            raise ValueError("Product category is required")
        if not item_id or not item_id.strip():
            raise ValueError("Item ID cannot be empty")

        logger.info(f"Adding/updating product: {item_id}")
        
        try:
            # Prepare product data
            product_data = {
                "title": item.get("title"),
                "category": item.get("category")
            }
            
            # Add optional fields if present
            for field in ["brand", "description"]:
                if field in item and item[field]:
                    product_data[field] = item[field]

            # Handle image URL with validation and fallback
            image_url = item.get("image_url")
            if image_url:
                if validate_image_url_sync(image_url):
                    product_data["image_url"] = image_url
                    logger.debug(f"Using provided image URL for {item_id}")
                else:
                    logger.warning(f"Invalid image URL for {item_id}, trying fallback")
                    from app.services.enrichment import enrichment_service
                    fallback_image_url = enrichment_service.get_item_image_sync(item)
                    if fallback_image_url:
                        product_data["image_url"] = fallback_image_url
                        logger.info(f"Using fallback image URL for {item_id}")

            # Insert/update product
            response = self.supabase.table("products").upsert(
                {**product_data, "id": item_id}
            ).execute()

            # Add price data if available
            if "price" in item and item["price"] is not None:
                price_data = {
                    "product_id": item_id,
                    "amount": float(item["price"]),
                    "currency": item.get("currency", "USD"),
                    "source_url": response.data[0].get("source_url") if response.data else None,
                }
                self.supabase.table("prices").insert(price_data).execute()
                logger.info(f"Added price data for {item_id}: {price_data['amount']} {price_data['currency']}")

            logger.info(f"Successfully added/updated product: {item_id}")
            
        except Exception as e:
            logger.error(f"Error adding item {item_id}: {str(e)}")
            raise

    def delete_item(self, item_id: str) -> None:
        """Delete product from database.
        
        Args:
            item_id: ID of the product to delete
            
        Raises:
            ValueError: If item_id is empty
            Exception: If deletion fails
        """
        if not item_id or not item_id.strip():
            raise ValueError("Item ID cannot be empty")
            
        if self.supabase is None:
            self.connect()
        
        try:
            logger.info(f"Deleting product: {item_id}")
            
            # Delete associated prices first (foreign key constraint)
            self.supabase.table("prices").delete().eq("product_id", item_id).execute()
            
            # Delete the product
            result = self.supabase.table("products").delete().eq("id", item_id).execute()
            
            if result.data:
                logger.info(f"Successfully deleted product: {item_id}")
            else:
                logger.warning(f"Product not found for deletion: {item_id}")
                
        except Exception as e:
            logger.error(f"Error deleting item {item_id}: {str(e)}")
            raise

# Global database service instance
database_service = DatabaseService()