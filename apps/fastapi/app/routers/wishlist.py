
import httpx

from fastapi import APIRouter, Depends, Request, status

from app.core.limiter import limiter
from app.services.auth import auth_service
from app.celery import process_and_add_item_task
from app.core.utils.jwt_generator import generate_jwt_token
from app.schemas.requests import HtmlPayload, OnrampPayload

wishlist_router = APIRouter(prefix="/wishlist")

@wishlist_router.post("/add", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(auth_service.require_auth)])
@limiter.limit("10/minute")
async def add_item(request: Request, payload: HtmlPayload):
    process_and_add_item_task.delay(payload.page_html, payload.item_id)
    return {"message": "Item accepted for processing."}

@wishlist_router.post("/onramp", status_code=status.HTTP_200_OK, dependencies=[Depends(auth_service.require_auth)])
@limiter.limit("10/minute")
async def fiat_onramp(request: Request, payload: OnrampPayload):
    try:
        jwt_token = generate_jwt_token()
        
        coinbase_url = "https://api.developer.coinbase.com/onramp/v1/token"
        headers = {
            "Authorization": f"Bearer {jwt_token}",
            "Content-Type": "application/json"
        }
        
        coinbase_payload = {
            "addresses": [
                {
                    "address": payload.address,
                    "blockchains": ["base"]
                }
            ],
            "assets": ["ETH"]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                coinbase_url,
                headers=headers,
                json=coinbase_payload
            )
            
            if response.status_code == 200:
                coinbase_data = response.json()
                return f"https://pay.coinbase.com/buy/select-asset?sessionToken={coinbase_data['token']}&defaultNetwork=base&presetFiatAmount=100"
            else:
                print(f"Coinbase API error: {response.status_code} - {response.text}")
                return {
                    "message": "Failed to generate onramp token",
                    "error": response.text,
                    "status_code": response.status_code
                }
                
    except Exception as e:
        print(f"Error in fiat_onramp: {str(e)}")
        return {
            "message": "Error processing onramp request",
            "error": str(e)
        }