"""URL validation utilities for image URLs.

Provides async and sync functions to validate image URLs
by checking URL format and content type headers.
"""

import logging
from typing import Optional

import httpx
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

async def validate_image_url(url: str) -> bool:
    """Validate image URL asynchronously.
    
    Checks if the provided URL is a valid image by:
    1. Validating URL format
    2. Making a HEAD request to check content type
    3. Verifying the response has an image MIME type
    
    Args:
        url: Image URL to validate
        
    Returns:
        bool: True if URL is a valid image, False otherwise
    """
    if not url or not isinstance(url, str):
        logger.warning("Invalid URL provided for validation")
        return False
        
    try:
        # Parse and validate URL structure
        parsed = urlparse(url.strip())
        if not parsed.scheme or not parsed.netloc:
            logger.debug(f"Invalid URL structure: {url}")
            return False
        
        # Only allow http/https schemes
        if parsed.scheme not in ('http', 'https'):
            logger.debug(f"Invalid URL scheme: {parsed.scheme}")
            return False
        
        async with httpx.AsyncClient() as client:
            response = await client.head(
                url, 
                timeout=5.0,
                follow_redirects=True,
                headers={'User-Agent': 'Wish-CDP-Bot/1.0'}
            )
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '').lower()
                is_image = content_type.startswith('image/')
                
                if is_image:
                    logger.debug(f"Valid image URL: {url} (type: {content_type})")
                else:
                    logger.debug(f"Invalid content type for image: {content_type}")
                    
                return is_image
            else:
                logger.debug(f"HTTP error validating URL {url}: {response.status_code}")
                return False
                
    except httpx.TimeoutException:
        logger.warning(f"Timeout validating image URL: {url}")
        return False
    except Exception as e:
        logger.error(f"Error validating image URL {url}: {str(e)}")
        return False 

def validate_image_url_sync(url: str) -> bool:
    """Validate image URL synchronously.
    
    Synchronous version of validate_image_url for use in
    non-async contexts like Celery tasks.
    
    Args:
        url: Image URL to validate
        
    Returns:
        bool: True if URL is a valid image, False otherwise
    """
    if not url or not isinstance(url, str):
        logger.warning("Invalid URL provided for sync validation")
        return False
        
    try:
        # Parse and validate URL structure
        parsed = urlparse(url.strip())
        if not parsed.scheme or not parsed.netloc:
            logger.debug(f"Invalid URL structure: {url}")
            return False
        
        # Only allow http/https schemes
        if parsed.scheme not in ('http', 'https'):
            logger.debug(f"Invalid URL scheme: {parsed.scheme}")
            return False
        
        with httpx.Client() as client:
            response = client.head(
                url, 
                timeout=5.0,
                follow_redirects=True,
                headers={'User-Agent': 'Wish-CDP-Bot/1.0'}
            )
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '').lower()
                is_image = content_type.startswith('image/')
                
                if is_image:
                    logger.debug(f"Valid image URL: {url} (type: {content_type})")
                else:
                    logger.debug(f"Invalid content type for image: {content_type}")
                    
                return is_image
            else:
                logger.debug(f"HTTP error validating URL {url}: {response.status_code}")
                return False
                
    except httpx.TimeoutException:
        logger.warning(f"Timeout validating image URL: {url}")
        return False
    except Exception as e:
        logger.error(f"Error validating image URL {url}: {str(e)}")
        return False