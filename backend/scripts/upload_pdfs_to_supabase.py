import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Ensure we are in the correct directory to load .env
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
bucket_name = "VJTI_AI"

sample_grs_dir = os.path.join(backend_dir, "sample_grs")

def main():
    if not os.path.exists(sample_grs_dir):
        print(f"Directory not found: {sample_grs_dir}")
        return

    print(f"Attempting to upload directly to bucket '{bucket_name}'...")


    for filename in os.listdir(sample_grs_dir):
        if filename.endswith(".pdf"):
            file_path = os.path.join(sample_grs_dir, filename)
            print(f"Uploading {filename}...")
            try:
                with open(file_path, "rb") as f:
                    # Upload to supabase storage
                    response = supabase.storage.from_(bucket_name).upload(
                        file=f,
                        path=filename,
                        file_options={"content-type": "application/pdf", "upsert": "true"}
                    )
                print(f"Successfully uploaded {filename}")
            except Exception as e:
                print(f"Failed to upload {filename}: {e}")

if __name__ == "__main__":
    main()
