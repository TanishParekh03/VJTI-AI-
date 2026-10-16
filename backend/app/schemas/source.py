"""Source citation schema — must match the Source interface in lib/mock-data.ts exactly."""
from pydantic import BaseModel, Field

class SourceRead(BaseModel):
    id: str
    message_id: str
    title: str
    type: str = Field(validation_alias="doc_type")
    page: str | None = None
    section: str | None = None
    snippet: str = ""
    relevance_score: float = 0.0
    document_id: str | None = None

    model_config = {"from_attributes": True, "populate_by_name": True}
