import os
import zipfile
import gdown

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

CATEGORY_MODEL_ID = "1HAIfrg4Q-Aw4X-Yeo2XArKyLeKbASiGH"
PRIORITY_MODEL_ID = "1AznQ-v3FyLZ99BzDu0LiEzg47eKQsMJJ"


def download_and_extract(file_id, zip_name):
    os.makedirs(MODELS_DIR, exist_ok=True)

    zip_path = os.path.join(MODELS_DIR, zip_name)
    url = f"https://drive.google.com/uc?id={file_id}"

    print(f"Downloading {zip_name}...")

    try:
        gdown.download(url, zip_path, quiet=False)
    except Exception as e:
        raise RuntimeError(f"Download failed for {zip_name}: {e}")

    if not os.path.exists(zip_path):
        raise RuntimeError(f"{zip_name} was not downloaded properly.")

    print("Extracting...")

    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(MODELS_DIR)
    except zipfile.BadZipFile:
        raise RuntimeError(f"{zip_name} is corrupted.")

    os.remove(zip_path)
    print(f"{zip_name} ready.")


def ensure_models():
    category_path = os.path.join(MODELS_DIR, "complaint_category_model")
    priority_path = os.path.join(MODELS_DIR, "complaint_priority_model")

    if not os.path.exists(category_path):
        download_and_extract(CATEGORY_MODEL_ID, "category_model.zip")

    if not os.path.exists(priority_path):
        download_and_extract(PRIORITY_MODEL_ID, "priority_model.zip")