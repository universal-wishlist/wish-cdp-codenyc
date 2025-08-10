"""Request schema definitions.

Defines Pydantic models for API request validation
and serialization.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional

class HtmlPayload(BaseModel):
    """Payload for adding HTML content to wishlist."""
    
    page_html: str = Field(
        ..., 
        min_length=1,
        max_length=1000000,  # 1MB limit
        description="Raw HTML content of the product page"
    )
    item_id: str = Field(
        ..., 
        min_length=1,
        max_length=255,
        description="Unique identifier for the wishlist item"
    )
    
    @validator('page_html')
    def validate_html_content(cls, v):
        if not v.strip():
            raise ValueError('HTML content cannot be empty or whitespace only')
        return v.strip()
    
    @validator('item_id')
    def validate_item_id(cls, v):
        if not v.strip():
            raise ValueError('Item ID cannot be empty or whitespace only')
        # Basic sanitization
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', v.strip()):
            raise ValueError('Item ID must contain only alphanumeric characters, hyphens, and underscores')
        return v.strip()

class OnrampPayload(BaseModel):
    """Payload for fiat onramp request."""
    
    address: str = Field(
        ..., 
        min_length=42,
        max_length=42,
        description="Ethereum wallet address for onramp destination"
    )
    
    @validator('address')
    def validate_ethereum_address(cls, v):
        if not v.strip():
            raise ValueError('Wallet address cannot be empty')
        
        address = v.strip().lower()
        
        # Basic Ethereum address validation
        if not address.startswith('0x'):
            raise ValueError('Address must start with 0x')
            
        if len(address) != 42:
            raise ValueError('Address must be exactly 42 characters long')
            
        # Check if it's a valid hex string
        import re
        if not re.match(r'^0x[a-f0-9]{40}$', address):
            raise ValueError('Address must be a valid hexadecimal string')
            
        return address

class QueryPayload(BaseModel):
    """Payload for product query requests."""
    
    query: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Product search query or question"
    )
    
    @validator('query')
    def validate_query(cls, v):
        if not v.strip():
            raise ValueError('Query cannot be empty or whitespace only')
        return v.strip()