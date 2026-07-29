"""Search response schemas — for CommandPalette.tsx ⌘K search."""
from typing import Literal

from pydantic import BaseModel


class SearchResultItem(BaseModel):
    id: str
    label: str
    description: str | None
    category: Literal["Navigation", "Documents", "Conversations"]
    doc_type: str | None = None   # "PDF" | "DOCX" | "Circular" for doc hits
    score: float | None = None    # relevance from Supermemory


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
    total: int
