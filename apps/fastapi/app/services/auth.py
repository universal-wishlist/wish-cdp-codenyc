"""Authentication service module.

Handles JWT token validation and user authentication
through Supabase integration.
"""

import logging
from typing import Optional

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from gotrue.types import User

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

class AuthService:
    """Authentication service for JWT token validation.
    
    Validates JWT tokens against Supabase user database
    and provides user context for protected endpoints.
    """
    
    async def require_auth(
        self,
        cred: HTTPAuthorizationCredentials = Security(bearer_scheme),
    ) -> User:
        """Validate JWT token and return authenticated user.
        
        Args:
            cred: HTTP authorization credentials from request header
            
        Returns:
            User: Authenticated user object
            
        Raises:
            HTTPException: If token is missing, invalid, or authentication fails
        """
        from app.services.database import database_service
        
        # Validate bearer token presence and format
        if cred is None or cred.scheme.lower() != "bearer":
            logger.warning("Authentication attempt without bearer token")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing bearer token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        jwt_token = cred.credentials
        
        # Validate token format
        if not jwt_token or len(jwt_token.strip()) == 0:
            logger.warning("Empty JWT token provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Empty bearer token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            # Retrieve user from database using JWT token
            user = database_service.get_user(jwt_token)
            
            if not user:
                logger.warning(f"Invalid JWT token attempted: {jwt_token[:8]}...")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid or expired token",
                )
                
            logger.debug(f"Valid JWT token used for user: {user.id}")
            return user
            
        except HTTPException:
            # Re-raise HTTP exceptions as-is
            raise
        except Exception as e:
            logger.error(f"Supabase authentication error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service error",
            )

# Global authentication service instance
auth_service = AuthService() 