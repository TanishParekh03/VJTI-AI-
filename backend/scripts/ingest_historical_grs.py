import asyncio
import io
import os
import re
import sys
import logging
from typing import Any

import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader

# Ensure we can import from the app directory when running as a module from backend/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.retrieval_service import ingest_document
from app.db.session import AsyncSessionLocal
from app.models.document import Document
import json
import uuid

# Setup basic logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

TARGET_URL = "https://dte.maharashtra.gov.in/government-resolutions-orders-letters-circulars-e/"

async def fetch_pdf_links(client: httpx.AsyncClient) -> list[str]:
    logger.info(f"Fetching page: {TARGET_URL}")
    try:
        response = await client.get(TARGET_URL, timeout=30.0)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to fetch {TARGET_URL}: {e}")
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.lower().endswith(".pdf"):
            if href.startswith("/"):
                href = "https://dte.maharashtra.gov.in" + href
            links.append(href)
    
    # Remove duplicates while preserving order
    return list(dict.fromkeys(links))

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text_pages = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_pages.append(t)
        extracted = "\n\n".join(text_pages)
        if extracted.strip():
            return extracted
    except Exception as e:
        logger.warning(f"Failed to extract text from PDF: {e}")
    return ""

async def process_pdf(client: httpx.AsyncClient, url: str) -> None:
    filename = url.split("/")[-1]
    title = filename.replace(".pdf", "").replace("-", " ").replace("_", " ")

    # Check if this document already exists in Postgres
    from app.db.session import AsyncSessionLocal
    from app.models.document import Document
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Document).where(Document.title == title))
        existing_doc = result.scalars().first()
        if existing_doc:
            logger.info(f"Document {filename} already exists. Skipping ingestion.")
            # Check if file exists on disk
            import os
            uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
            os.makedirs(uploads_dir, exist_ok=True)
            file_path = os.path.join(uploads_dir, f"{existing_doc.id}.pdf")
            if not os.path.exists(file_path):
                logger.info(f"Downloading missing PDF for {filename}...")
                try:
                    response = await client.get(url, timeout=60.0)
                    response.raise_for_status()
                    with open(file_path, "wb") as f:
                        f.write(response.content)
                    logger.info(f"Saved missing PDF for {filename}")
                except Exception as e:
                    logger.error(f"Failed to download missing PDF {url}: {e}")
            return

    # We generate a real UUID for Postgres and Qdrant
    doc_id = str(uuid.uuid4())
    
    logger.info(f"Downloading {filename}...")
    try:
        response = await client.get(url, timeout=60.0)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to download {url}: {e}")
        return

    pdf_bytes = response.content
    logger.info(f"Extracting text from {filename}...")
    
    # Save the original PDF to backend/uploads
    import os
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    file_path = os.path.join(uploads_dir, f"{doc_id}.pdf")
    with open(file_path, "wb") as f:
        f.write(pdf_bytes)
    
    text = extract_text_from_pdf(pdf_bytes)
    
    if not text:
        logger.warning(f"No text extracted from {filename} (might be a scanned image). Skipping.")
        return

    logger.info(f"Ingesting {filename} into Qdrant...")
    
    title = filename.replace(".pdf", "").replace("-", " ").replace("_", " ")
    
    # Generate AI summary and tags
    from app.services import llm_service
    ai_summary = "Automatically ingested historical Government Resolution."
    ai_tags = ["historical", "gr", "public"]
    try:
        ai_summary, ai_tags = await llm_service.generate_summary_and_tags(text, title=title)
        logger.info(f"Generated AI summary and tags for {filename}")
    except Exception as e:
        logger.warning(f"Failed to generate AI summary for {filename}: {e}")
    metadata = {
        "source_url": url,
        "doc_type": "PDF",
        "category": "Historical GR",
        "title": title
    }
    
    container_tags = ["dept:hte", "visibility:public"]
    
    try:
        # Pass the extracted text encoded as UTF-8 bytes to our backend's ingest_document
        await ingest_document(
            doc_id=doc_id,
            file_bytes=text.encode("utf-8"),
            filename=filename,
            container_tags=container_tags,
            metadata=metadata
        )
        logger.info(f"Successfully ingested {filename} into Qdrant")
        
        # Now add it to Postgres so it appears on the dashboard
        async with AsyncSessionLocal() as db:
            doc = Document(
                id=doc_id,
                title=title,
                category="Historical GR",
                department="hte",
                file_type="PDF",
                file_size=f"{len(pdf_bytes) / 1024 / 1024:.1f} MB",
                summary=ai_summary,
                tags=json.dumps(ai_tags),
                visibility="public",
                status="indexed",
                supermemory_document_id=doc_id
            )
            db.add(doc)
            await db.commit()
            logger.info(f"Successfully added {filename} to Dashboard")
            
    except Exception as e:
        logger.error(f"Failed to ingest {filename}: {e}")

async def main():
    logger.info("Starting historical GR ingestion pipeline...")
    async with httpx.AsyncClient(verify=False) as client:
        pdf_links = await fetch_pdf_links(client)
        logger.info(f"Found {len(pdf_links)} PDFs.")
        
        logger.info(f"Processing all {len(pdf_links)} documents...")
        
        for link in pdf_links:
            await process_pdf(client, link)
            await asyncio.sleep(1)

if __name__ == "__main__":
    asyncio.run(main())
