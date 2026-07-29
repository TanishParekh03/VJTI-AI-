"""Document request/response schemas."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class DocumentRead(BaseModel):
    id: str
    title: str
    category: str
    department: str
    file_type: str
    file_size: str
    pages: int
    summary: str
    tags: list[str]
    versions: int
    visibility: str
    status: str
    upload_date: datetime
    uploaded_by: str | None

    model_config = {"from_attributes": True}


class DocumentStatusResponse(BaseModel):
    id: str
    status: str
    supermemory_document_id: str | None
    ingestion_error: str | None


class UploadResponse(BaseModel):
    document_id: str
    status: str = "processing"
    message: str = "Document uploaded and queued for indexing"


class DocumentUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    visibility: Literal["public", "internal", "restricted"] | None = None
    summary: str | None = None
    tags: list[str] | None = None


class CompareRequest(BaseModel):
    doc_id_a: str
    doc_id_b: str


class CompareResponse(BaseModel):
    comparison: str
    doc_a_title: str
    doc_b_title: str

