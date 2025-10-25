"""Tests for documentation ingestion functionality."""

import pytest
from pathlib import Path
from codetandem.docs_ingestion import (
    DocumentationScraper,
    TextChunker,
    DocumentChunk,
    ingest_documentation,
)


@pytest.fixture
def sample_html():
    """Sample HTML content."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Sample Documentation</title>
    </head>
    <body>
        <nav>Navigation</nav>
        <main>
            <h1>Main Title</h1>
            <p>This is the main content of the documentation.</p>
            <h2>Section 1</h2>
            <p>Content for section 1.</p>
            <h2>Section 2</h2>
            <p>Content for section 2.</p>
        </main>
        <footer>Footer content</footer>
    </body>
    </html>
    """


@pytest.fixture
def sample_html_file(tmp_path, sample_html):
    """Create a sample HTML file."""
    file_path = tmp_path / "sample.html"
    file_path.write_text(sample_html, encoding="utf-8")
    return file_path


def test_document_chunk_to_dict():
    """Test DocumentChunk to_dict conversion."""
    chunk = DocumentChunk(
        content="Test content", metadata={"title": "Test", "index": 0}
    )

    data = chunk.to_dict()
    assert data["content"] == "Test content"
    assert data["metadata"]["title"] == "Test"
    assert data["metadata"]["index"] == 0


def test_documentation_scraper_init():
    """Test DocumentationScraper initialization."""
    scraper = DocumentationScraper()
    assert scraper.user_agent == "CodeTandem/0.1.0"
    assert scraper.session is not None


def test_load_local_file(sample_html_file):
    """Test loading HTML from local file."""
    scraper = DocumentationScraper()
    content = scraper.load_local_file(sample_html_file)

    assert content is not None
    assert "Sample Documentation" in content
    assert "<main>" in content


def test_load_local_file_nonexistent():
    """Test loading non-existent file."""
    scraper = DocumentationScraper()
    content = scraper.load_local_file("/nonexistent/file.html")

    assert content is None


def test_parse_html(sample_html):
    """Test HTML parsing."""
    scraper = DocumentationScraper()
    parsed = scraper.parse_html(sample_html)

    assert parsed["title"] == "Sample Documentation"
    assert "Main Title" in parsed["text"]
    assert "Section 1" in parsed["text"]
    assert len(parsed["headings"]) > 0
    assert "Navigation" not in parsed["text"]  # Nav should be removed
    assert "Footer" not in parsed["text"]  # Footer should be removed


def test_parse_html_with_base_url(sample_html):
    """Test HTML parsing with base URL."""
    scraper = DocumentationScraper()
    parsed = scraper.parse_html(sample_html, base_url="https://example.com/docs")

    assert parsed["url"] == "https://example.com/docs"


def test_scrape_local_file(sample_html_file):
    """Test scraping from local file."""
    scraper = DocumentationScraper()
    doc = scraper.scrape(str(sample_html_file))

    assert doc is not None
    assert doc["title"] == "Sample Documentation"
    assert "Main Title" in doc["text"]


def test_text_chunker_init():
    """Test TextChunker initialization."""
    chunker = TextChunker(chunk_size=500, chunk_overlap=100)

    assert chunker.chunk_size == 500
    assert chunker.chunk_overlap == 100
    assert len(chunker.separators) > 0


def test_split_text_small():
    """Test splitting text smaller than chunk size."""
    chunker = TextChunker(chunk_size=1000)
    text = "This is a short text."

    chunks = chunker.split_text(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_split_text_large():
    """Test splitting large text."""
    chunker = TextChunker(chunk_size=50, chunk_overlap=10)
    text = "This is a sentence. " * 20  # Creates ~400 chars

    chunks = chunker.split_text(text)
    assert len(chunks) > 1
    assert all(len(chunk) <= 60 for chunk in chunks)  # Allow some margin


def test_chunk_document():
    """Test chunking a parsed document."""
    chunker = TextChunker(chunk_size=100, chunk_overlap=20)
    doc = {
        "title": "Test Doc",
        "text": "This is some content. " * 10,
        "url": "https://example.com",
    }

    chunks = chunker.chunk_document(doc)

    assert len(chunks) > 0
    assert all(isinstance(c, DocumentChunk) for c in chunks)
    assert all(c.metadata["title"] == "Test Doc" for c in chunks)
    assert all("chunk_index" in c.metadata for c in chunks)


def test_chunk_document_no_metadata():
    """Test chunking document without including metadata."""
    chunker = TextChunker(chunk_size=100)
    doc = {"title": "Test Doc", "text": "Short text", "url": "https://example.com"}

    chunks = chunker.chunk_document(doc, include_metadata=False)

    assert len(chunks) > 0
    assert "title" not in chunks[0].metadata or chunks[0].metadata["title"] == ""


def test_ingest_documentation_single_file(sample_html_file):
    """Test ingesting documentation from single file."""
    chunks = ingest_documentation([str(sample_html_file)])

    assert len(chunks) > 0
    assert all(isinstance(c, DocumentChunk) for c in chunks)
    assert any("Main Title" in c.content for c in chunks)


def test_ingest_documentation_multiple_files(tmp_path):
    """Test ingesting documentation from multiple files."""
    file1 = tmp_path / "doc1.html"
    file1.write_text("<html><body><h1>Doc 1</h1><p>Content 1</p></body></html>")

    file2 = tmp_path / "doc2.html"
    file2.write_text("<html><body><h1>Doc 2</h1><p>Content 2</p></body></html>")

    chunks = ingest_documentation([str(file1), str(file2)])

    assert len(chunks) >= 2
    contents = [c.content for c in chunks]
    combined = " ".join(contents)
    assert "Doc 1" in combined or "Doc 2" in combined


def test_ingest_documentation_custom_chunk_size(sample_html_file):
    """Test ingesting with custom chunk size."""
    chunks = ingest_documentation(
        [str(sample_html_file)], chunk_size=50, chunk_overlap=10
    )

    # With smaller chunk size, should get more chunks
    assert len(chunks) > 1


def test_ingest_documentation_invalid_source():
    """Test ingesting from invalid source."""
    chunks = ingest_documentation(["/nonexistent/file.html"])

    # Should handle gracefully and return empty or partial results
    assert isinstance(chunks, list)
