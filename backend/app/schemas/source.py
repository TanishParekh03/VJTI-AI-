"""Source citation schema — must match the Source interface in lib/mock-data.ts exactly."""
from pydantic import BaseModel


class SourceRead(BaseModel):
    id: str
    title: str
    type: str       # "PDF" | "DOCX" | "Circular"  (maps to doc_type column)
    page: str | None
    section: str | None
    snippet: str
    relevance_score: float

    model_config = {"from_attributes": True}
