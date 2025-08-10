from cdp.auth.utils.jwt import generate_jwt, JwtOptions

from app.core.config import settings

def generate_jwt_token():
    jwt_token = generate_jwt(
        JwtOptions(
            api_key_id=settings.CDP_API_KEY_ID,
            api_key_secret=settings.CDP_API_KEY_SECRET,
            request_method="POST",
            request_host="api.developer.coinbase.com",
            request_path="/onramp/v1/token",
        )
    )
    return jwt_token