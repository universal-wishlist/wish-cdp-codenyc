import httpx

from urllib.parse import urlparse

async def validate_image_url(url: str):
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False
        
        async with httpx.AsyncClient() as client:
            response = await client.head(url, timeout=5.0)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '').lower()
                if content_type.startswith('image/'):
                    return True
                else:
                    return False
            else:
                return False
    except Exception as e:
        return False 

def validate_image_url_sync(url: str):
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            return False
        
        with httpx.Client() as client:
            response = client.head(url, timeout=5.0)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '').lower()
                return content_type.startswith('image/')
            else:
                return False
    except Exception:
        return False