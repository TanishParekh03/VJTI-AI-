import asyncio
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete
from app.db.session import AsyncSessionLocal
from app.models.document import Document
from app.services.retrieval_service import _get_client, COLLECTION_NAME
from qdrant_client.http.models import Distance, VectorParams, SparseVectorParams

async def wipe_all():
    # 1. Wipe PostgreSQL
    print("Wiping PostgreSQL documents table...")
    async with AsyncSessionLocal() as db:
        await db.execute(delete(Document))
        await db.commit()
    print("PostgreSQL wiped.")

    # 2. Wipe Qdrant
    print("Wiping Qdrant collection...")
    client = _get_client()
    try:
        await client.delete_collection(COLLECTION_NAME)
        print("Deleted old Qdrant collection.")
    except Exception as e:
        print(f"Collection didn't exist or error: {e}")

    # 3. Wipe uploads directory
    print("Wiping uploads directory...")
    uploads_dir = Path(os.environ.get("UPLOADS_DIR", "uploads"))
    if uploads_dir.exists():
        for f in uploads_dir.glob("*"):
            if f.is_file():
                f.unlink()
    print("Uploads wiped.")
    print("ALL CLEAN!")

if __name__ == "__main__":
    asyncio.run(wipe_all())
