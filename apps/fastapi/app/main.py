"""Main FastAPI application module.

This module initializes the FastAPI application with middleware, routing,
and payment integration for the Wish CDP hackathon project.
"""

import logging
from typing import Dict, Any

from fastapi import FastAPI, status, Request, HTTPException
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from fastapi.middleware.cors import CORSMiddleware
from x402.fastapi.middleware import require_payment

from app.core.config import settings
from app.core.limiter import limiter
from app.routers.wishlist import wishlist_router

# Configure logging with structured format for better debugging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
    ]
)

logger = logging.getLogger(__name__)

# Initialize FastAPI application with API versioning
app = FastAPI(
    title="Wish CDP API",
    description="Ecommerce product insights API with x402 payment integration",
    version="1.0.0",
    root_path="/api/v1/core"
)

# Configure rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(wishlist_router, tags=["wishlist"])

app.middleware("http")(
    require_payment(
        path="/query",
        price="$0.001",
        network="base-sepolia",
        pay_to_address=settings.WISH_WALLET,
        description="Query Wish for ecommerce product insights",
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Product search query or question"}
            },
            "required": ["query"]
        },
        output_schema={
            "type": "object",
            "properties": {
                "products": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "price": {"type": "number"},
                            "rating": {"type": "number"},
                            "availability": {"type": "string"}
                        }
                    }
                },
                "insights": {"type": "string", "description": "Market insights and recommendations"}
            }
        }
    )
)

@app.get("/health", status_code=status.HTTP_200_OK, tags=["system"])
def health_check() -> Dict[str, str]:
    """Health check endpoint.
    
    Returns:
        Dict[str, str]: Health status response
    """
    logger.info("Health check endpoint called")
    return {"status": "ok", "service": "wish-cdp-api"}

@app.post("/query", tags=["insights"])
async def get_query(request: Request) -> Dict[str, Any]:
    """Process product query and return wishlist insights.
    
    This endpoint requires payment via x402 protocol and returns
    mock analytics data for product insights.
    
    Args:
        request: FastAPI request object containing query data
        
    Returns:
        Dict[str, Any]: Wishlist insights and analytics data
        
    Raises:
        HTTPException: If request processing fails
    """
    try:
        data = await request.json()
        logger.info(f"Processing query request with data keys: {list(data.keys())}")
        
        # Validate required fields
        if not data.get("query"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Query field is required"
            )
        
        # TODO: Replace with actual AI-powered insights generation
        # For hackathon purposes, returning mock data
        response_data = {
            "wishlistInsights": {
                "totalWishlistAdds": 12847,
                "averageDaysOnWishlist": 18.4,
                "conversionFromWishlist": 14.2,
                "priceWillingness": {
                    "currentPrice": 349,
                    "averageWishlistPricePoint": 287,
                    "priceDropThreshold": 299
                },
                "competitorBenchmark": {
                    "yourPosition": "23% above market average",
                    "optimalDiscountToMatch": "18%",
                    "projectedSalesLift": "280%"
                },
                "urgencySignals": {
                    "removeFromWishlistRate": 8.3,
                    "purchaseElsewhere": 31.7,
                    "waitingForDiscount": 67.1
                }
            }
        }
        
        logger.info("Successfully generated wishlist insights")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error processing query"
        )

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting server on port {settings.PORT}")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=settings.PORT,
        loop="asyncio",
        log_level="info"
    )