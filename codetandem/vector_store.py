"""
Local vector database for documentation storage and retrieval.

This module provides a lightweight vector store implementation for
storing and querying document embeddings.
"""

import json
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import hashlib

try:
    from sentence_transformers import SentenceTransformer

    HAS_SENTENCE_TRANSFORMERS = True
except ImportError:
    HAS_SENTENCE_TRANSFORMERS = False

import numpy as np


@dataclass
class Document:
    """Represents a document in the vector store."""

    id: str
    content: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary (excluding embedding for JSON)."""
        return {"id": self.id, "content": self.content, "metadata": self.metadata}


class VectorStore:
    """Simple local vector store for document embeddings."""

    def __init__(self, persist_directory: str, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize vector store.

        Args:
            persist_directory: Directory to store the database
            model_name: Name of sentence-transformers model to use
        """
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)

        self.model_name = model_name
        self.model = None
        self.documents: List[Document] = []
        self.embeddings: Optional[np.ndarray] = None

        # Load existing data if present
        self._load()

    def _get_model(self) -> "SentenceTransformer":
        """Lazy load the sentence transformer model."""
        if not HAS_SENTENCE_TRANSFORMERS:
            raise ImportError(
                "sentence-transformers is required for vector store. "
                "Install with: pip install sentence-transformers"
            )

        if self.model is None:
            print(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)

        return self.model

    def _generate_id(self, content: str) -> str:
        """Generate a unique ID for content."""
        return hashlib.md5(content.encode()).hexdigest()

    def _documents_path(self) -> Path:
        """Get path to documents JSON file."""
        return self.persist_directory / "documents.json"

    def _embeddings_path(self) -> Path:
        """Get path to embeddings pickle file."""
        return self.persist_directory / "embeddings.pkl"

    def _load(self):
        """Load existing documents and embeddings."""
        docs_path = self._documents_path()
        emb_path = self._embeddings_path()

        if docs_path.exists() and emb_path.exists():
            # Load documents
            with open(docs_path, "r", encoding="utf-8") as f:
                docs_data = json.load(f)
                self.documents = [
                    Document(id=d["id"], content=d["content"], metadata=d["metadata"])
                    for d in docs_data
                ]

            # Load embeddings
            with open(emb_path, "rb") as f:
                self.embeddings = pickle.load(f)

            print(
                f"Loaded {len(self.documents)} documents from {self.persist_directory}"
            )

    def _save(self):
        """Save documents and embeddings to disk."""
        # Save documents
        docs_data = [doc.to_dict() for doc in self.documents]
        with open(self._documents_path(), "w", encoding="utf-8") as f:
            json.dump(docs_data, f, indent=2, ensure_ascii=False)

        # Save embeddings
        if self.embeddings is not None:
            with open(self._embeddings_path(), "wb") as f:
                pickle.dump(self.embeddings, f)

        print(f"Saved {len(self.documents)} documents to {self.persist_directory}")

    def add_documents(
        self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None
    ) -> List[str]:
        """
        Add documents to the vector store.

        Args:
            texts: List of document texts
            metadatas: Optional list of metadata dicts for each document

        Returns:
            List of document IDs
        """
        if not texts:
            return []

        if metadatas is None:
            metadatas = [{} for _ in texts]

        # Generate embeddings
        model = self._get_model()
        new_embeddings = model.encode(texts, show_progress_bar=True)

        # Create documents
        ids = []
        for text, metadata, embedding in zip(texts, metadatas, new_embeddings):
            doc_id = self._generate_id(text)

            # Check if document already exists
            existing = next((d for d in self.documents if d.id == doc_id), None)
            if existing:
                ids.append(doc_id)
                continue

            doc = Document(
                id=doc_id, content=text, metadata=metadata, embedding=embedding.tolist()
            )

            self.documents.append(doc)
            ids.append(doc_id)

        # Update embeddings array
        if self.embeddings is None:
            self.embeddings = new_embeddings
        else:
            self.embeddings = np.vstack([self.embeddings, new_embeddings])

        # Persist changes
        self._save()

        return ids

    def similarity_search(self, query: str, k: int = 5) -> List[Tuple[Document, float]]:
        """
        Search for similar documents.

        Args:
            query: Query text
            k: Number of results to return

        Returns:
            List of (Document, similarity_score) tuples
        """
        if not self.documents or self.embeddings is None:
            return []

        # Generate query embedding
        model = self._get_model()
        query_embedding = model.encode([query])[0]

        # Calculate cosine similarities
        similarities = np.dot(self.embeddings, query_embedding) / (
            np.linalg.norm(self.embeddings, axis=1) * np.linalg.norm(query_embedding)
        )

        # Get top k indices
        top_indices = np.argsort(similarities)[::-1][:k]

        # Return documents with scores
        results = [
            (self.documents[idx], float(similarities[idx])) for idx in top_indices
        ]

        return results

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store."""
        return {
            "num_documents": len(self.documents),
            "persist_directory": str(self.persist_directory),
            "model_name": self.model_name,
            "embedding_dimension": self.embeddings.shape[1]
            if self.embeddings is not None
            else None,
        }

    def clear(self):
        """Clear all documents and embeddings."""
        self.documents = []
        self.embeddings = None

        # Remove persisted files
        if self._documents_path().exists():
            self._documents_path().unlink()
        if self._embeddings_path().exists():
            self._embeddings_path().unlink()

        print("Vector store cleared")


def create_vector_store(
    persist_directory: str, model_name: str = "all-MiniLM-L6-v2"
) -> VectorStore:
    """
    Create or load a vector store.

    Args:
        persist_directory: Directory to store the database
        model_name: Name of sentence-transformers model

    Returns:
        VectorStore instance
    """
    return VectorStore(persist_directory, model_name)
