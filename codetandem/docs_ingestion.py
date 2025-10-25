"""
Documentation ingestion and processing for vector database storage.

This module provides functionality to fetch, parse, chunk, and embed
documentation from URLs or local HTML files.
"""

import re
from pathlib import Path
from typing import List, Dict, Any, Union, Optional
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


@dataclass
class DocumentChunk:
    """Represents a chunk of documentation text."""

    content: str
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {"content": self.content, "metadata": self.metadata}


class DocumentationScraper:
    """Scrapes and parses documentation from URLs or local files."""

    def __init__(self, user_agent: str = "CodeTandem/0.1.0"):
        self.user_agent = user_agent
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": user_agent})

    def fetch_url(self, url: str, timeout: int = 30) -> Optional[str]:
        """
        Fetch HTML content from a URL.

        Args:
            url: URL to fetch
            timeout: Request timeout in seconds

        Returns:
            HTML content as string, or None on error
        """
        try:
            response = self.session.get(url, timeout=timeout)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None

    def load_local_file(self, file_path: Union[str, Path]) -> Optional[str]:
        """
        Load HTML content from a local file.

        Args:
            file_path: Path to local HTML file

        Returns:
            HTML content as string, or None on error
        """
        try:
            path = Path(file_path)
            if not path.exists():
                return None
            return path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            return None

    def parse_html(self, html: str, base_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Parse HTML content and extract text and metadata.

        Args:
            html: HTML content string
            base_url: Base URL for resolving relative links

        Returns:
            Dictionary with parsed content and metadata
        """
        soup = BeautifulSoup(html, "html.parser")

        # Remove script and style elements
        for element in soup(["script", "style", "nav", "footer"]):
            element.decompose()

        # Extract title
        title = soup.find("title")
        title_text = title.get_text().strip() if title else "Untitled"

        # Extract main content
        # Try to find main content area
        main_content = soup.find("main") or soup.find("article") or soup.find("body")

        if not main_content:
            text = soup.get_text()
        else:
            text = main_content.get_text()

        # Clean up text
        lines = [line.strip() for line in text.splitlines()]
        text = "\n".join(line for line in lines if line)

        # Extract headings structure
        headings = []
        for heading in soup.find_all(["h1", "h2", "h3"]):
            headings.append(
                {"level": int(heading.name[1]), "text": heading.get_text().strip()}
            )

        # Extract links
        links = []
        if base_url:
            for link in soup.find_all("a", href=True):
                href = link["href"]
                absolute_url = urljoin(base_url, href)
                links.append({"text": link.get_text().strip(), "url": absolute_url})

        return {
            "title": title_text,
            "text": text,
            "headings": headings,
            "links": links,
            "url": base_url,
        }

    def scrape(self, source: str) -> Optional[Dict[str, Any]]:
        """
        Scrape documentation from URL or local file.

        Args:
            source: URL or file path

        Returns:
            Parsed documentation dictionary, or None on error
        """
        # Determine if source is URL or file
        if source.startswith("http://") or source.startswith("https://"):
            html = self.fetch_url(source)
            base_url = source
        else:
            html = self.load_local_file(source)
            base_url = None

        if not html:
            return None

        return self.parse_html(html, base_url)


class TextChunker:
    """Chunks text into manageable pieces for embedding."""

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        separators: Optional[List[str]] = None,
    ):
        """
        Initialize text chunker.

        Args:
            chunk_size: Target size of each chunk in characters
            chunk_overlap: Overlap between chunks in characters
            separators: List of separators to split on (default: paragraph, sentence)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " "]

    def split_text(self, text: str) -> List[str]:
        """
        Split text into chunks using recursive character splitting.

        Args:
            text: Text to split

        Returns:
            List of text chunks
        """
        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        current_chunk = ""

        # Try each separator in order
        for separator in self.separators:
            if separator in text:
                parts = text.split(separator)

                for i, part in enumerate(parts):
                    # Add separator back except for last part
                    if i < len(parts) - 1:
                        part = part + separator

                    # If adding this part would exceed chunk size
                    if len(current_chunk) + len(part) > self.chunk_size:
                        if current_chunk:
                            chunks.append(current_chunk.strip())
                            # Start new chunk with overlap
                            overlap_text = (
                                current_chunk[-self.chunk_overlap :]
                                if len(current_chunk) > self.chunk_overlap
                                else current_chunk
                            )
                            current_chunk = overlap_text + part
                        else:
                            # Part itself is too large, need to split it
                            current_chunk = part
                    else:
                        current_chunk += part

                break

        # Add final chunk
        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks

    def chunk_document(
        self, doc: Dict[str, Any], include_metadata: bool = True
    ) -> List[DocumentChunk]:
        """
        Chunk a parsed document into DocumentChunk objects.

        Args:
            doc: Parsed document dictionary from scraper
            include_metadata: Include document metadata in chunks

        Returns:
            List of DocumentChunk objects
        """
        text = doc.get("text", "")
        chunks = self.split_text(text)

        result = []
        for i, chunk_text in enumerate(chunks):
            metadata = {"chunk_index": i, "total_chunks": len(chunks)}

            if include_metadata:
                metadata["title"] = doc.get("title", "")
                metadata["url"] = doc.get("url", "")

            result.append(DocumentChunk(content=chunk_text, metadata=metadata))

        return result


def ingest_documentation(
    sources: List[str], chunk_size: int = 1000, chunk_overlap: int = 200
) -> List[DocumentChunk]:
    """
    Ingest documentation from multiple sources and return chunks.

    Args:
        sources: List of URLs or file paths to ingest
        chunk_size: Target chunk size in characters
        chunk_overlap: Overlap between chunks

    Returns:
        List of DocumentChunk objects ready for embedding
    """
    scraper = DocumentationScraper()
    chunker = TextChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    all_chunks = []

    for source in sources:
        print(f"Ingesting: {source}")
        doc = scraper.scrape(source)

        if doc:
            chunks = chunker.chunk_document(doc)
            all_chunks.extend(chunks)
            print(f"  Created {len(chunks)} chunks")
        else:
            print(f"  Failed to ingest {source}")

    return all_chunks
