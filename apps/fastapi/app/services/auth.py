import logging

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=False)

class AuthService:
    async def require_auth(
        self,
        cred: HTTPAuthorizationCredentials = Security(bearer_scheme),
    ):
        from app.services.database import database_service
        if cred is None or cred.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing bearer token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        jwt_token = cred.credentials

        try:
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
            raise
        except Exception as e:
            logger.error(f"Supabase authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service error",
            )

auth_service = AuthService() 