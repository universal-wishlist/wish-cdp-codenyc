"""Wishlist router module.

Handles wishlist item management and fiat onramp functionality
with authentication and rate limiting.
"""

import logging
from typing import Dict, Any, Union

import httpx
from fastapi import APIRouter, Depends, Request, status, HTTPException

from app.core.limiter import limiter
from app.services.auth import auth_service
from app.celery import process_and_add_item_task
from app.core.utils.jwt_generator import generate_jwt_token
from app.schemas.requests import HtmlPayload, OnrampPayload

logger = logging.getLogger(__name__)

wishlist_router = APIRouter(
    prefix="/wishlist",
    tags=["wishlist"]
)

@wishlist_router.post("/add", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(auth_service.require_auth)])
@limiter.limit("10/minute")
async def add_item(request: Request, payload: HtmlPayload) -> Dict[str, str]:
    """Add an item to the wishlist for processing.
    
    This endpoint accepts HTML content and item ID, then queues the item
    for asynchronous processing including classification and enrichment.
    
    Args:
        request: FastAPI request object for rate limiting
        payload: HtmlPayload containing page_html and item_id
        
    Returns:
        Dict[str, str]: Confirmation message
        
    Raises:
        HTTPException: If validation fails or processing error occurs
    """
    try:
        logger.info(f"Adding item to wishlist: {payload.item_id}")
        
        # Validate payload
        if not payload.page_html or not payload.page_html.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="page_html cannot be empty"
            )
        
        if not payload.item_id or not payload.item_id.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="item_id cannot be empty"
            )
        
        # Queue item for processing
        process_and_add_item_task.delay(payload.page_html, payload.item_id)
        logger.info(f"Successfully queued item {payload.item_id} for processing")
        
        return {"message": "Item accepted for processing.", "item_id": payload.item_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding item {payload.item_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing item addition"
        )

@wishlist_router.post("/onramp", status_code=status.HTTP_200_OK, dependencies=[Depends(auth_service.require_auth)])
@limiter.limit("10/minute")
async def fiat_onramp(request: Request, payload: OnrampPayload) -> Union[str, Dict[str, Any]]:
    """Generate a fiat onramp URL for purchasing cryptocurrency.
    
    This endpoint creates a Coinbase onramp session token and returns
    a URL for users to purchase ETH on Base network.
    
    Args:
        request: FastAPI request object for rate limiting
        payload: OnrampPayload containing wallet address
        
    Returns:
        Union[str, Dict[str, Any]]: Onramp URL on success or error details
        
    Raises:
        HTTPException: If address validation fails or token generation errors
    """
    try:
        # Validate wallet address
        if not payload.address or not payload.address.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Wallet address is required"
            )
        
        # Basic Ethereum address validation
        if not payload.address.startswith('0x') or len(payload.address) != 42:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Ethereum address format"
            )
        
        logger.info(f"Generating onramp token for address: {payload.address[:10]}...")
        
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
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                coinbase_url,
                headers=headers,
                json=coinbase_payload
            )
            
            if response.status_code == 200:
                coinbase_data = response.json()
                onramp_url = f"https://pay.coinbase.com/buy/select-asset?sessionToken={coinbase_data['token']}&defaultNetwork=base&presetFiatAmount=10"
                logger.info(f"Successfully generated onramp URL for address: {payload.address[:10]}...")
                return onramp_url
            else:
                logger.error(f"Coinbase API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to generate onramp token: {response.text}"
                )
                
    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error("Timeout calling Coinbase API")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Timeout connecting to payment service"
        )
    except Exception as e:
        logger.error(f"Error in fiat_onramp: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing onramp request"
        )