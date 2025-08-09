from pydantic import BaseModel

class HtmlPayload(BaseModel):
    page_html: str
    item_id: str