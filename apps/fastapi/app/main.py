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
        description="Query Wish for consumer data",
        input_schema={
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name"}
            }
        },
        output_schema={
            "type": "object",
            "properties": {
                "weather": {"type": "string"},
                "temperature": {"type": "number"}
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
        "report": {
            "weather": "sunny",
            "temperature": 70,
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