"""
Bulk-ingest Maharashtra Government Resolutions from orgpedia/mahGRs.

Source: https://github.com/orgpedia/mahGRs/tree/main/GRs

Strategy
--------
* Only the `.pdf.en.txt` (English translation) files are used for ingestion.
* The filename encodes the issue timestamp: YYYYMMDDHHMMSSXXXX, so we derive
  a `gr_number` and an approximate `upload_date` from it.
* We ingest up to LIMIT GRs per department per run (default: 50 HTE-only).
* Documents already ingested (matched by gr_number) are skipped.

Usage
-----
    # From the backend/ directory with the venv active:
    python scripts/ingest_mah_grs.py                         # HTE dept only, 50 GRs
    python scripts/ingest_mah_grs.py --limit 200             # HTE dept, 200 GRs
    python scripts/ingest_mah_grs.py --all-depts --limit 20  # All departments, 20 each
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx

# Bootstrap: add backend/ to sys.path so app imports work
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.core.config import settings  # noqa: E402
from app.db.session import AsyncSessionLocal  # noqa: E402
from app.models.document import Document  # noqa: E402
from app.services import retrieval_service  # noqa: E402

# Git Trees API — one call returns ALL paths in the repo recursively.
# This avoids per-directory Contents API calls which are heavily rate-limited.
GITHUB_TREE_API = "https://api.github.com/repos/orgpedia/mahGRs/git/trees/main?recursive=1"
GITHUB_RAW_BASE = "https://raw.githubusercontent.com/orgpedia/mahGRs/main"
MAX_CONTENT_CHARS = 40_000  # ~40 KB char limit per document sent to Supermemory

# Module-level cache so we fetch the tree only once per script run
_TREE_CACHE: list[dict] | None = None

HTE_DEPT = "Higher_and_Technical_Education_Department"

ALL_DEPARTMENTS = [
    "Higher_and_Technical_Education_Department",
    "Finance_Department",
    "General_Administration_Department",
    "School_Education_and_Sports_Department",
    "Medical_Education_and_Drugs_Department",
    "Public_Health_Department",
    "Home_Department",
    "Revenue_and_Forest_Department",
    "Urban_Development_Department",
    "Rural_Development_Department",
    "Industries,_Energy_and_Labour_Department",
    "Water_Resources_Department",
    "Public_Works_Department",
    "Housing_Department",
    "Social_Justice_and_Special_Assistance_Department",
    "Tribal_Development_Department",
    "Women_and_Child_Development_Department",
    "Minorities_Development_Department",
    "Skill_Development_and_Entrepreneurship_Department",
    "Information_Technology_Department",
    "Planning_Department",
    "Law_and_Judiciary_Department",
    "Tourism_and_Cultural_Affairs_Department",
    "Environment_Department",
    "Water_Supply_and_Sanitation_Department",
    "Agriculture,_Dairy_Development,_Animal_Husbandry_and_Fisheries_Department",
    "Co-operation,_Textiles_and_Marketing_Department",
    "Food,_Civil_Supplies_and_Consumer_Protection_Department",
    "Other_Backward_Bahujan_Welfare_Department",
    "Soil_and_Water_Conservation_Department",
    "Marathi_Language_Department",
    "Parliamentary_Affairs_Department",
    "Persons_with_Disabilities_Welfare_Department",
]


def _dept_to_category(dept_name: str) -> str:
    return dept_name.replace("_", " ")


def _parse_gr_number_and_date(filename: str, dept: str) -> tuple[str, datetime]:
    stem = filename.split(".")[0]  # e.g. "201710121514029708"
    try:
        dt = datetime.strptime(stem[:14], "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
    except ValueError:
        dt = datetime.now(timezone.utc)
    dept_short = dept.replace(",", "").split("_")[0][:6].upper()
    suffix = stem[14:] if len(stem) > 14 else stem
    gr_number = f"GR-{dept_short}-{stem[:8]}-{suffix}"
    return gr_number, dt


async def _get_tree(client: httpx.AsyncClient) -> list[dict]:
    """Fetch the full repository tree once (cached) using the Git Trees API."""
    global _TREE_CACHE
    if _TREE_CACHE is not None:
        return _TREE_CACHE
    print("  Fetching full repo tree from GitHub...")
    resp = await client.get(GITHUB_TREE_API, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    _TREE_CACHE = [item for item in data.get("tree", []) if item.get("type") == "blob"]
    print(f"  Tree loaded: {len(_TREE_CACHE)} files total")
    return _TREE_CACHE


async def _fetch_file_list(client: httpx.AsyncClient, dept: str) -> list[dict]:
    """Return file-entry-like dicts for .en.txt files in the dept folder."""
    tree = await _get_tree(client)
    prefix = f"GRs/{dept}/"
    entries = []
    for item in tree:
        path = item.get("path", "")
        if path.startswith(prefix) and path.endswith(".pdf.en.txt"):
            filename = path.split("/")[-1]
            download_url = f"{GITHUB_RAW_BASE}/{path}"
            entries.append({"name": filename, "download_url": download_url})
    return entries


async def _fetch_text(client: httpx.AsyncClient, download_url: str) -> str:
    resp = await client.get(download_url, timeout=30)
    resp.raise_for_status()
    text = resp.text
    if len(text) > MAX_CONTENT_CHARS:
        text = text[:MAX_CONTENT_CHARS]
    return text


async def _gr_already_ingested(gr_number: str) -> bool:
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Document.id).where(Document.gr_number == gr_number)
        )
        return result.scalar_one_or_none() is not None


async def ingest_gr(
    client: httpx.AsyncClient,
    file_entry: dict,
    dept: str,
    category: str,
) -> str:
    filename = file_entry["name"]
    download_url = file_entry["download_url"]
    gr_number, gr_date = _parse_gr_number_and_date(filename, dept)

    if await _gr_already_ingested(gr_number):
        return "skipped"

    try:
        text = await _fetch_text(client, download_url)
    except Exception as exc:
        return f"error:fetch:{exc}"

    if not text.strip():
        return "error:empty_content"

    # Use first non-empty line as title
    first_line = next((ln.strip() for ln in text.splitlines() if ln.strip()), filename)
    title = first_line[:200]

    dept_label = dept.replace("_", " ")
    doc_id = str(uuid.uuid4())
    dept_key = dept.replace(",", "").split("_")[0].lower()

    container_tags = [
        "dept:hte" if dept == HTE_DEPT else f"dept:{retrieval_service._sanitize_tag(dept_label[:32])}",
        "visibility:public",
        "source:mahgrs",
    ]

    metadata = {
        "title": title,
        "doc_type": "PDF",
        "category": category,
        "department": dept_label,
        "visibility": "public",
        "gr_number": gr_number,
        "source": "orgpedia/mahGRs",
        "filename": filename,
        "tags": ["government-resolution", "maharashtra", dept_key],
    }

    try:
        await retrieval_service.ingest_document(
            doc_id=doc_id,
            file_bytes=text.encode("utf-8"),
            filename=filename.replace(".en.txt", ".txt"),
            container_tags=container_tags,
            metadata=metadata,
        )
    except Exception as exc:
        return f"error:supermemory:{exc}"

    async with AsyncSessionLocal() as db:
        doc = Document(
            id=doc_id,
            title=title,
            category=category,
            department=dept_label,
            file_type="PDF",
            file_size=f"{len(text.encode()) / 1024:.1f} KB",
            pages=0,
            summary="",
            tags=json.dumps(["government-resolution", "maharashtra", dept_key]),
            visibility="public",
            status="indexed",
            supermemory_document_id=doc_id,
            gr_number=gr_number,
            upload_date=gr_date,
            uploaded_by=None,
        )
        db.add(doc)
        await db.commit()

    return "ok"


async def ingest_department(
    client: httpx.AsyncClient,
    dept: str,
    limit: int,
    concurrency: int = 5,
) -> dict:
    print(f"\n??  {dept}")
    try:
        files = await _fetch_file_list(client, dept)
    except Exception as exc:
        print(f"  ? Could not list files: {exc}")
        return {"dept": dept, "total": 0, "ok": 0, "skipped": 0, "error": 0}

    files = files[:limit]
    category = _dept_to_category(dept)
    print(f"  ? {len(files)} GR files to process (limit={limit})")

    stats = {"dept": dept, "total": len(files), "ok": 0, "skipped": 0, "error": 0}
    sem = asyncio.Semaphore(concurrency)

    async def _bounded(entry: dict) -> None:
        async with sem:
            result = await ingest_gr(client, entry, dept, category)
            if result == "ok":
                stats["ok"] += 1
                print(f"    ?  {entry['name'][:60]}")
            elif result == "skipped":
                stats["skipped"] += 1
                print(f"    ?   {entry['name'][:60]} (already ingested)")
            else:
                stats["error"] += 1
                print(f"    ??   {entry['name'][:50]}: {result}")

    await asyncio.gather(*[_bounded(f) for f in files])
    print(f"  ? done: {stats['ok']} ingested, {stats['skipped']} skipped, {stats['error']} errors")
    return stats


async def main(all_depts: bool, limit: int) -> None:
    departments = ALL_DEPARTMENTS if all_depts else [HTE_DEPT]

    import os
    headers: dict = {}
    token = os.environ.get("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        print("??  No GITHUB_TOKEN set — unauthenticated (60 req/hr limit). Set GITHUB_TOKEN to avoid throttling.")

    async with httpx.AsyncClient(headers=headers, follow_redirects=True) as client:
        all_stats = []
        for dept in departments:
            stats = await ingest_department(client, dept, limit=limit)
            all_stats.append(stats)

    total_ok = sum(s["ok"] for s in all_stats)
    total_skipped = sum(s["skipped"] for s in all_stats)
    total_error = sum(s["error"] for s in all_stats)
    print(f"\n{'='*60}")
    print(f"??  COMPLETE — Ingested: {total_ok} | Skipped: {total_skipped} | Errors: {total_error}")
    print(f"{'='*60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bulk-ingest Maharashtra GRs from orgpedia/mahGRs")
    parser.add_argument("--all-depts", action="store_true", help="Process all departments (default: HTE only)")
    parser.add_argument("--limit", type=int, default=50, help="Max GRs per department (default: 50)")
    args = parser.parse_args()
    asyncio.run(main(all_depts=args.all_depts, limit=args.limit))
