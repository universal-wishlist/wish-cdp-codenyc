"""JWT token generation utilities for Coinbase CDP API.

Provides functions to generate JWT tokens for authenticated
requests to Coinbase Developer Platform APIs.
"""

import logging

from cdp.auth.utils.jwt import generate_jwt, JwtOptions

from app.core.config import settings

logger = logging.getLogger(__name__)

def generate_jwt_token() -> str:
    """Generate JWT token for Coinbase CDP API authentication.
    
    Creates a JWT token for making authenticated requests to the
    Coinbase Developer Platform API, specifically for onramp operations.
    
    Returns:
        str: JWT token for API authentication
        
    Raises:
        Exception: If token generation fails due to invalid credentials
    """
    try:
        logger.debug("Generating JWT token for CDP API")
        
        jwt_token = generate_jwt(
            JwtOptions(
                api_key_id=settings.CDP_API_KEY_ID,
                api_key_secret=settings.CDP_API_KEY_SECRET,
                request_method="POST",
                request_host="api.developer.coinbase.com",
                request_path="/onramp/v1/token",
            )
        )
        
        logger.info("Successfully generated JWT token for CDP API")
        return jwt_token
        
    except Exception as e:
        logger.error(f"Failed to generate JWT token: {str(e)}")
        raise Exception(f"JWT generation failed: {str(e)}")