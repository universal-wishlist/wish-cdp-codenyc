from fastapi import APIRouter, Depends, Request, status

from app.core.limiter import limiter
from app.services.auth import auth_service
from app.schemas.requests import HtmlPayload
from app.celery import process_and_add_item_task

wishlist_router = APIRouter(prefix="/wishlist")

@wishlist_router.post("/add", status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(auth_service.require_auth)])
@limiter.limit("10/minute")
async def add_item(request: Request, payload: HtmlPayload):
    process_and_add_item_task.delay(payload.page_html, payload.item_id)
    return {"message": "Item accepted for processing."}