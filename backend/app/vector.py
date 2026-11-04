from functools import lru_cache
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from .config import settings

@lru_cache
def embedding_model():
    return HuggingFaceEmbeddings(model_name=settings.embedding_model,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True})

@lru_cache
def store():
    return Chroma(collection_name="vetscholar", persist_directory=str(settings.chroma_dir.resolve()),
                  embedding_function=embedding_model(),
                  collection_metadata={"hnsw:space": "cosine"})
