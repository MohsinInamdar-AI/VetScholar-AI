from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "VetScholar AI"
    data_dir: Path = Path("../data")
    max_upload_mb: int = 25
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.2:3b"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    chunk_size: int = 900
    chunk_overlap: int = 150
    retrieval_k: int = 5
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def uploads_dir(self): return self.data_dir / "uploads"
    @property
    def chroma_dir(self): return self.data_dir / "chroma"
    @property
    def temp_dir(self): return self.data_dir / "temp"
    @property
    def sqlite_path(self): return self.data_dir / "vetscholar.sqlite3"
    @property
    def origins(self): return [x.strip() for x in self.allowed_origins.split(",") if x.strip()]

settings = Settings()
for p in (settings.data_dir, settings.uploads_dir, settings.chroma_dir, settings.temp_dir):
    p.mkdir(parents=True, exist_ok=True)
