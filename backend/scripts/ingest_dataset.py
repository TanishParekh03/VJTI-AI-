import asyncio
import os
import uuid
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
import urllib.request

# Ensure we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv()

from app.db.session import AsyncSessionLocal
from app.models.document import Document
from app.api.documents import _extract_text_from_file_bytes
from app.services import llm_service, retrieval_service
from sqlalchemy import select
import re
import urllib.request
from typing import List, Tuple

# We will scrape the latest GRs directly from the official portal
PORTAL_URLS = [
    'https://gr.maharashtra.gov.in/1145/Government-Resolutions',
    'https://dte.maharashtra.gov.in/government-resolutions-orders-letters-circulars-e/'
]
BASE_URL = 'https://gr.maharashtra.gov.in'

def scrape_real_grs(limit_per_portal=5) -> List[Tuple[str, str]]:
    sample_urls = []
    
    for portal_url in PORTAL_URLS:
        req = urllib.request.Request(portal_url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
            links = re.findall(r'href=[\'"]?([^\'\" >]+)', html)
            pdfs = list(set([l for l in links if l.lower().endswith('.pdf')]))
            
            for i, pdf_path in enumerate(pdfs[:limit_per_portal]):
                # Sometimes paths are relative
                full_url = pdf_path if pdf_path.startswith('http') else BASE_URL + '/' + pdf_path.lstrip('./')
                sample_urls.append((full_url, f"Scraped Official GR - {portal_url.split('.')[0].split('//')[-1]} {i+1}"))
                
        except Exception as e:
            print(f"Scraping failed for {portal_url}: {e}")
            
    return sample_urls

async def download_samples(sample_dir: Path):
    sample_dir.mkdir(parents=True, exist_ok=True)
    sample_urls = scrape_real_grs(limit_per_portal=5)
    print(f"Scraped {len(sample_urls)} PDFs for ingestion.")
    
    for i, (url, title) in enumerate(sample_urls):
        try:
            filename = url.split('/')[-1]
            if not filename.endswith('.pdf'):
                filename = f"GR_{i+1}.pdf"
            filepath = sample_dir / filename
            if not filepath.exists():
                print(f"Downloading {filename} from {url}...")
                try:
                    urllib.request.urlretrieve(url, filepath)
                except Exception as e:
                    print(f"Failed to download from {url}, creating dummy file for testing: {e}")
                    filename = filename.replace(".pdf", ".txt")
                    filepath = sample_dir / filename
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(f"This is a dummy test document representing: {title}\nMaharashtra Government Resolution test file.")
            print(f"Ready: {filename}")
        except Exception as e:
            print(f"Error handling {url}: {e}")

async def ingest_file(filepath: Path, db_session):
    filename = filepath.name
    doc_id = str(uuid.uuid4())
    print(f"\n--- Processing {filename} ---")
    
    with open(filepath, "rb") as f:
        file_bytes = f.read()

    print("1. Extracting text via OCR...")
    try:
        raw_text = _extract_text_from_file_bytes(file_bytes, filename)
    except Exception as e:
        print(f"OCR failed: {e}")
        return
        
    if not raw_text:
        print("OCR returned no text.")
        return

    has_marathi = any('\u0900' <= char <= '\u097f' for char in (raw_text + filename))
    
    metadata = {
        "title": filename,
        "category": "dataset_ingestion",
        "doc_type": "PDF",
        "filename": filename
    }

    final_text_content = raw_text

    print(f"2. Language check: {'Marathi detected' if has_marathi else 'English only'}")
    if has_marathi:
        metadata["original_language"] = "mr"
        metadata["translated"] = True
        print("Translating Marathi to English...")
        try:
            translated_english = await llm_service.translate_text(raw_text, target_lang="English")
            final_text_content = translated_english + "\n\n=== ORIGINAL MARATHI ===\n\n" + raw_text
        except Exception as e:
            print(f"Translation failed: {e}")

    print("3. Ingesting to Qdrant (Hybrid Search)...")
    await retrieval_service.ingest_document(
        doc_id=doc_id,
        file_bytes=final_text_content.encode("utf-8"),
        filename=filename,
        container_tags=["visibility:public", "dept:hte"],
        metadata=metadata,
    )

    print("4. Generating AI Summary...")
    ai_summary, ai_tags = await llm_service.generate_summary_and_tags(raw_text, title=filename)

    # Insert into PostgreSQL
    print("5. Saving to PostgreSQL Database...")
    new_doc = Document(
        id=doc_id,
        title=filename,
        category="dataset_ingestion",
        file_type="PDF",
        status="indexed",
        supermemory_document_id=doc_id,
        summary=ai_summary,
        tags=json.dumps(ai_tags)
    )
    db_session.add(new_doc)
    await db_session.commit()
    print(f"Successfully ingested {filename} (ID: {doc_id})")

async def main():
    base_dir = Path(__file__).resolve().parent.parent
    sample_dir = base_dir / "sample_grs"
    
    await download_samples(sample_dir)
    
    print("\nStarting batch ingestion pipeline...")
    async with AsyncSessionLocal() as db_session:
        for filepath in sample_dir.glob("*.pdf"):
            await ingest_file(filepath, db_session)
            
    print("\nBatch ingestion complete!")

if __name__ == "__main__":
    asyncio.run(main())
