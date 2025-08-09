from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from pydantic_extra_types.currency_code import Currency

class ProductOption(BaseModel):
    name: str
    values: List[str]

class ProductVariant(BaseModel):
    title: str
    available: bool
    sku: Optional[str] = None
    price: Optional[float] = None

class CategoryEnum(str, Enum):
    footwear = "Footwear"
    apparel = "Apparel"
    accessories = "Accessories"
    electronics = "Electronics"
    home = "Home"
    beauty = "Beauty"
    sports = "Sports"
    toys = "Toys"
    other = "Other"

class ItemClassificationSchema(BaseModel):
    probability: float = Field(
        ge=0.0, le=1.0,
        description="A probability score from 0 to 1 indicating confidence that the content is related to an ecommerce product."
    )

class ItemSchema(BaseModel):
    title: str = Field(description="The main title or name of the product.")
    category: CategoryEnum = Field(description="The category of the wishlist item.")
    price: float = Field(default=0, description="The price of the item as a number, without currency symbols.")
    currency: Optional[Currency] = Field(default=None, description="The currency of the item.")
    description: Optional[str] = Field(default=None, description="A brief description of the item.")
    brand: Optional[str] = Field(default=None, description="The brand or manufacturer of the item (e.g., 'Nike', 'Apple').")
    image_url: Optional[str] = Field(default=None, description="The URL of the main product image.")