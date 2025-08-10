"""Rate limiting configuration.

Provides rate limiting functionality for API endpoints
using slowapi and Redis backend.
"""

import logging
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)

# Configure rate limiter with remote address as key
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["1000/hour"]  # Global default limit
)

logger.info("Rate limiter initialized with remote address key function")