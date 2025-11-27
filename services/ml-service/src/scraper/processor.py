import logging
import hashlib
from typing import Dict, List
from datetime import datetime
import html2text
import requests
from google.cloud import storage
from src.config import settings
import re
from collections import Counter
import nltk

# Download required NLTK data (run once)
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt", quiet=True)

try:
    nltk.data.find("corpora/stopwords")
except LookupError:
    nltk.download("stopwords", quiet=True)

from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords

logger = logging.getLogger(__name__)

# Initialize Google Cloud Storage client
_gcs_client = None


def get_gcs_client() -> storage.Client:
    """Get or create GCS client"""
    global _gcs_client
    if _gcs_client is None:
        if settings.GCS_SERVICE_ACCOUNT_KEY:
            _gcs_client = storage.Client.from_service_account_json(
                settings.GCS_SERVICE_ACCOUNT_KEY
            )
        else:
            # Use default credentials
            _gcs_client = storage.Client(project=settings.GCS_PROJECT_ID)
    return _gcs_client


class ContentProcessor:
    """
    Process scraped content:
    - Convert HTML to Markdown
    - Upload images to GCS
    - Extract keywords
    - Calculate quality score
    """

    def __init__(self, enable_gcs: bool = False):
        self.html_converter = html2text.HTML2Text()
        self.html_converter.ignore_links = False
        self.html_converter.ignore_images = False
        self.html_converter.body_width = 0  # No wrapping
        self.stop_words = set(stopwords.words("english"))
        self.enable_gcs = enable_gcs  # Feature flag for GCS upload

    def process(self, scraped_data: Dict) -> Dict:
        """
        Process scraped content

        Args:
            scraped_data: Dict with url, title, content_html, images, metadata

        Returns:
            Dict with url, title, content (markdown), images (GCS URLs), keywords, quality_score, metadata
        """
        try:
            # Convert HTML to Markdown
            markdown = self._html_to_markdown(scraped_data["content_html"])

            # Upload images to GCS (if enabled)
            if self.enable_gcs:
                gcs_image_urls = self._upload_images(scraped_data["images"], scraped_data["url"])
                images = gcs_image_urls
                images_processed = True
            else:
                # Keep raw URLs
                images = scraped_data.get("images", [])
                images_processed = False

            # Extract keywords
            keywords = self._extract_keywords(markdown)

            # Calculate quality score
            quality_score = self._calculate_quality(markdown, scraped_data["title"])

            # Word count
            word_count = len(markdown.split())

            return {
                "url": scraped_data["url"],
                "title": scraped_data["title"],
                "content": markdown,
                "images": images,
                "images_processed": images_processed,
                "keywords": keywords,
                "qualityScore": quality_score,
                "metadata": {
                    **scraped_data.get("metadata", {}),
                    "wordCount": word_count,
                },
            }

        except Exception as e:
            logger.error(f"Content processing failed: {e}")
            raise

    def _html_to_markdown(self, html: str) -> str:
        """Convert HTML to Markdown"""
        try:
            markdown = self.html_converter.handle(html)
            # Clean up excessive newlines
            markdown = re.sub(r"\n{3,}", "\n\n", markdown)
            return markdown.strip()
        except Exception as e:
            logger.error(f"HTML to Markdown conversion failed: {e}")
            return ""

    def _upload_images(self, image_urls: List[str], source_url: str) -> List[str]:
        """
        Download and upload images to GCS

        Args:
            image_urls: List of image URLs
            source_url: Source article URL (for generating unique names)

        Returns:
            List of GCS public URLs
        """
        gcs_urls = []

        # Generate unique prefix from source URL
        url_hash = hashlib.md5(source_url.encode()).hexdigest()[:8]

        for idx, img_url in enumerate(image_urls[:5]):  # Limit to 5 images
            try:
                # Download image
                response = requests.get(img_url, timeout=10)
                response.raise_for_status()

                # Get file extension
                content_type = response.headers.get("Content-Type", "image/jpeg")
                ext = content_type.split("/")[-1].split(";")[0]
                if ext not in ["jpeg", "jpg", "png", "gif", "webp"]:
                    ext = "jpg"

                # Generate unique filename
                filename = f"scraped/{url_hash}_{idx}.{ext}"

                # Upload to GCS
                gcs_url = self._upload_to_gcs(response.content, filename, content_type)

                if gcs_url:
                    gcs_urls.append(gcs_url)

            except Exception as e:
                logger.warning(f"Failed to upload image {img_url}: {e}")
                continue

        return gcs_urls

    def _upload_to_gcs(self, data: bytes, filename: str, content_type: str) -> str:
        """Upload data to GCS and return public URL"""
        try:
            client = get_gcs_client()
            bucket = client.bucket(settings.GCS_BUCKET)
            blob = bucket.blob(filename)

            # Upload with public-read ACL
            blob.upload_from_string(data, content_type=content_type)
            blob.make_public()

            # Return public URL
            if settings.GCS_PUBLIC_URL:
                return f"{settings.GCS_PUBLIC_URL}/{filename}"
            else:
                return blob.public_url

        except Exception as e:
            logger.error(f"GCS upload failed for {filename}: {e}")
            return None

    def _extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """
        Extract keywords from text using simple frequency analysis

        Args:
            text: Text content
            max_keywords: Maximum number of keywords to return

        Returns:
            List of keywords
        """
        try:
            # Tokenize
            words = word_tokenize(text.lower())

            # Filter: alphanumeric, length > 3, not stopwords
            words = [
                w
                for w in words
                if w.isalnum() and len(w) > 3 and w not in self.stop_words
            ]

            # Count frequencies
            word_freq = Counter(words)

            # Get top keywords
            keywords = [word for word, count in word_freq.most_common(max_keywords)]

            return keywords

        except Exception as e:
            logger.error(f"Keyword extraction failed: {e}")
            return []

    def _calculate_quality(self, markdown: str, title: str) -> float:
        """
        Calculate content quality score (0.0 - 1.0)

        Factors:
        - Word count (prefer 300-2000 words)
        - Has title
        - Has images (if available)
        - Paragraph structure
        """
        score = 0.0

        # Word count (0-0.4 points)
        word_count = len(markdown.split())
        if word_count >= 300:
            score += 0.2
        if 500 <= word_count <= 2000:
            score += 0.2
        elif word_count > 2000:
            score += 0.1  # Penalize very long articles

        # Has title (0.2 points)
        if title and len(title) > 10:
            score += 0.2

        # Paragraph count (0.2 points)
        paragraphs = [p for p in markdown.split("\n\n") if len(p.strip()) > 50]
        if len(paragraphs) >= 3:
            score += 0.2

        # Formatting (0.2 points) - has headers, lists, etc
        has_headers = bool(re.search(r"^#+\s", markdown, re.MULTILINE))
        has_lists = bool(re.search(r"^[\*\-]\s", markdown, re.MULTILINE))

        if has_headers:
            score += 0.1
        if has_lists:
            score += 0.1

        return min(score, 1.0)


# Global instance
_processor = None


def get_processor(enable_gcs: bool = False) -> ContentProcessor:
    """Get or create ContentProcessor singleton"""
    global _processor
    if _processor is None:
        _processor = ContentProcessor(enable_gcs=enable_gcs)
    return _processor
