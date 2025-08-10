import logging

from fastapi import FastAPI, status, Request
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from fastapi.middleware.cors import CORSMiddleware
from x402.fastapi.middleware import require_payment

from app.core.config import settings
from app.core.limiter import limiter
from app.routers.wishlist import wishlist_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(),
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI(root_path="/api/v1/core")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wishlist_router)

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

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    return {"status": "ok"}

@app.post("/query")
async def get_query(request: Request):
    data = await request.json()
    print(data)
    return {
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=settings.PORT,
        loop="asyncio"
    )