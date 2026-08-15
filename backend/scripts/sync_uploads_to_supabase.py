import os
from dotenv import load_dotenv
from supabase import create_client, Client

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(backend_dir, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
bucket_name = "VJTI_AI"

uploads_dir = os.path.join(backend_dir, "uploads")

def main():
    if not os.path.exists(uploads_dir):
        print(f"Directory not found: {uploads_dir}")
        return

    print(f"Uploading files from {uploads_dir} to bucket '{bucket_name}'...")

    for filename in os.listdir(uploads_dir):
        file_path = os.path.join(uploads_dir, filename)
        if os.path.isfile(file_path):
            print(f"Uploading {filename}...")
            try:
                with open(file_path, "rb") as f:
                    supabase.storage.from_(bucket_name).upload(
                        file=f,
                        path=filename,
                        file_options={"content-type": "application/pdf", "upsert": "true"}
                    )
                print(f"Successfully uploaded {filename}")
            except Exception as e:
                print(f"Failed to upload {filename}: {e}")

if __name__ == "__main__":
    main()
