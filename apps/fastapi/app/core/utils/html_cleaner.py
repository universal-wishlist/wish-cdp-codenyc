"""HTML cleaning utilities for AI processing.

Provides functions to clean and extract content from HTML
for optimal LLM processing and product data extraction.
"""

import logging
from typing import Optional

from bs4 import BeautifulSoup
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

def clean_html_for_llm(html_content: str) -> str:
    """Clean HTML content for LLM processing.
    
    Removes scripts, styles, navigation elements and extracts
    clean text content suitable for AI analysis.
    
    Args:
        html_content: Raw HTML content to clean
        
    Returns:
        str: Cleaned text content or empty string if no content
    """
    if not html_content or not html_content.strip():
        logger.warning("Empty HTML content provided to cleaner")
        return ""

    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove unwanted elements that don't contain product info
        unwanted_tags = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript']
        for tag in soup(unwanted_tags):
            tag.decompose()
            
        # Focus on main content areas
        main_content = (
            soup.find('main') or 
            soup.find('article') or 
            soup.find('div', class_=lambda x: x and 'content' in x.lower()) or
            soup.find('body') or 
            soup
        )
        
        # Extract clean text with proper spacing
        text = main_content.get_text(separator=' ', strip=True)
        
        # Clean up extra whitespace
        import re
        text = re.sub(r'\s+', ' ', text).strip()
        
        if not text:
            logger.warning("No text content found after HTML cleaning")
            return "No content found"
            
        logger.debug(f"Successfully cleaned HTML to {len(text)} characters")
        return text
        
    except Exception as e:
        logger.error(f"Error cleaning HTML content: {str(e)}")
        return "Error processing HTML content"
def extract_product_image_url(html_content: str, source_url: Optional[str] = None) -> Optional[str]:
    """Extract product image URL from HTML content.
    
    Looks for the first image in main content areas and returns
    the absolute URL if possible.
    
    Args:
        html_content: Raw HTML content to process
        source_url: Base URL for resolving relative image URLs
        
    Returns:
        Optional[str]: Image URL if found, None otherwise
    """
    if not html_content or not html_content.strip():
        logger.warning("Empty HTML content provided for image extraction")
        return None

    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Look in main content areas first
        content_areas = [
            soup.find('main'),
            soup.find('article'), 
            soup.find('div', class_=lambda x: x and any(term in x.lower() for term in ['product', 'item', 'content'])),
            soup.find('body'),
            soup
        ]
        
        for area in content_areas:
            if not area:
                continue
                
            # Look for product-related images first
            img_selectors = [
                'img[class*="product"]',
                'img[class*="item"]', 
                'img[alt*="product"]',
                'img[src]'  # Fallback to any image
            ]
            
            for selector in img_selectors:
                img_tag = area.select_one(selector)
                if img_tag and img_tag.get('src'):
                    image_url = img_tag['src'].strip()
                    
                    # Skip data URLs, very small images, or placeholder images
                    if (image_url.startswith('data:') or 
                        'placeholder' in image_url.lower() or
                        'loading' in image_url.lower()):
                        continue
                    
                    # Convert relative URLs to absolute
                    if source_url and not image_url.startswith(('http://', 'https://')):
                        image_url = urljoin(source_url, image_url)
                    
                    logger.info(f"Found product image URL: {image_url}")
                    return image_url
        
        logger.info("No suitable product image found in HTML")
        return None
        
    except Exception as e:
        logger.error(f"Error extracting image URL: {str(e)}")
        return None