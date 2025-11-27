"""
Content deduplication using fingerprinting and fuzzy matching.
Detects duplicate content across sources.
"""

import logging
import hashlib
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher
from src.db.mongodb import get_sync_db, COLLECTIONS

logger = logging.getLogger(__name__)


class ContentDeduplicator:
    """
    Detects duplicate content using multiple strategies.
    """

    def __init__(self):
        self.db = get_sync_db()
        self.collection = self.db[COLLECTIONS.get("scraped_content", "scrapedcontents")]

    def generate_fingerprint(self, content: str, title: str) -> str:
        """
        Generate content fingerprint using SimHash-like approach.

        Args:
            content: Article content (markdown)
            title: Article title

        Returns:
            Fingerprint hash
        """
        try:
            # Combine title and content
            text = f"{title}\n{content}"

            # Normalize: lowercase, remove extra whitespace
            text = ' '.join(text.lower().split())

            # Extract significant words (skip common words)
            stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}
            words = [w for w in text.split() if len(w) > 3 and w not in stop_words]

            # Take first 500 words for fingerprinting
            significant_text = ' '.join(words[:500])

            # Generate hash
            fingerprint = hashlib.md5(significant_text.encode('utf-8')).hexdigest()

            return fingerprint

        except Exception as e:
            logger.error(f"Fingerprint generation failed: {e}")
            return ""

    def fuzzy_title_match(self, title1: str, title2: str) -> float:
        """
        Calculate fuzzy similarity between titles.

        Args:
            title1: First title
            title2: Second title

        Returns:
            Similarity score (0-1)
        """
        if not title1 or not title2:
            return 0.0

        # Normalize
        t1 = title1.lower().strip()
        t2 = title2.lower().strip()

        # Sequence matching
        similarity = SequenceMatcher(None, t1, t2).ratio()

        return similarity

    def find_duplicates(
        self,
        url: str,
        title: str,
        content: str,
        fingerprint: str = None
    ) -> List[Dict]:
        """
        Find potential duplicates for content.

        Args:
            url: Content URL (already normalized)
            title: Content title
            content: Content markdown
            fingerprint: Pre-computed fingerprint (optional)

        Returns:
            List of duplicate documents
        """
        duplicates = []

        try:
            # Generate fingerprint if not provided
            if not fingerprint:
                fingerprint = self.generate_fingerprint(content, title)

            # Strategy 1: Exact URL match
            url_match = self.collection.find_one({"url": url})
            if url_match:
                duplicates.append({
                    "strategy": "exact_url",
                    "similarity": 1.0,
                    "document": url_match
                })
                return duplicates  # Exact match, no need to check further

            # Strategy 2: Fingerprint match
            if fingerprint:
                fingerprint_matches = list(self.collection.find({
                    "dedup.fingerprint": fingerprint
                }).limit(5))

                for match in fingerprint_matches:
                    duplicates.append({
                        "strategy": "fingerprint",
                        "similarity": 1.0,
                        "document": match
                    })

            # Strategy 3: Fuzzy title match (within same domain)
            domain = self._extract_domain(url)
            if domain:
                # Find articles from same domain with similar titles
                same_domain = list(self.collection.find({
                    "sourceDomain": domain
                }).limit(20))

                for doc in same_domain:
                    similarity = self.fuzzy_title_match(title, doc.get("title", ""))
                    if similarity > 0.85:  # High similarity threshold
                        duplicates.append({
                            "strategy": "fuzzy_title",
                            "similarity": similarity,
                            "document": doc
                        })

            logger.info(f"Found {len(duplicates)} potential duplicates for: {title[:50]}...")

        except Exception as e:
            logger.error(f"Duplicate detection failed: {e}", exc_info=True)

        return duplicates

    def mark_as_duplicate(
        self,
        duplicate_url: str,
        original_id: str,
        strategy: str,
        similarity: float
    ):
        """
        Mark content as duplicate of another.

        Args:
            duplicate_url: URL of duplicate content
            original_id: ID of original content
            strategy: Detection strategy used
            similarity: Similarity score
        """
        try:
            self.collection.update_one(
                {"url": duplicate_url},
                {
                    "$set": {
                        "status": "rejected",
                        "dedup.duplicate_of": original_id,
                        "dedup.detection_strategy": strategy,
                        "dedup.similarity_score": similarity,
                    }
                }
            )
            logger.info(f"Marked as duplicate: {duplicate_url} → {original_id}")

        except Exception as e:
            logger.error(f"Failed to mark duplicate: {e}")

    def get_best_version(self, duplicates: List[Dict]) -> Optional[str]:
        """
        Select best version from duplicates based on quality.

        Args:
            duplicates: List of duplicate documents

        Returns:
            ID of best version
        """
        if not duplicates:
            return None

        # Score each document
        scored = []
        for dup in duplicates:
            doc = dup["document"]
            score = self._calculate_document_score(doc)
            scored.append((doc["_id"], score))

        # Return ID of highest scored
        best = max(scored, key=lambda x: x[1])
        return str(best[0])

    def _calculate_document_score(self, doc: Dict) -> float:
        """
        Calculate document quality score for duplicate resolution.

        Args:
            doc: Document

        Returns:
            Score (higher is better)
        """
        score = 0.0

        # Quality score (if available)
        score += doc.get("qualityScore", 0) * 0.4

        # Word count (prefer longer, more complete articles)
        word_count = doc.get("metadata", {}).get("wordCount", 0)
        score += min(word_count / 1000, 1.0) * 0.3

        # Enriched content (prefer enriched)
        if doc.get("enriched"):
            score += 0.2

        # Recency (prefer newer)
        scraped_at = doc.get("scrapedAt")
        if scraped_at:
            # Bonus for recent (last 7 days)
            from datetime import datetime, timedelta
            age_days = (datetime.utcnow() - scraped_at).days
            if age_days <= 7:
                score += 0.1

        return score

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        from urllib.parse import urlparse
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname.lower() if parsed.hostname else ''
            if hostname.startswith('www.'):
                hostname = hostname[4:]
            return hostname
        except:
            return ""


# Singleton
_deduplicator = None


def get_deduplicator() -> ContentDeduplicator:
    """Get or create deduplicator singleton"""
    global _deduplicator
    if _deduplicator is None:
        _deduplicator = ContentDeduplicator()
    return _deduplicator
