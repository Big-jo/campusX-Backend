"""
Enhanced quality scoring for content.
Uses multiple signals including ML features, source reputation, and readability.
"""

import logging
import re
from typing import Dict
from datetime import datetime, timedelta
from src.db.mongodb import get_sync_db, COLLECTIONS

logger = logging.getLogger(__name__)


class QualityScorer:
    """
    Advanced quality scoring system.
    """

    def __init__(self):
        self.db = get_sync_db()
        self.content_collection = self.db[COLLECTIONS.get("scraped_content", "scrapedcontents")]
        self.source_reputation_cache = {}

    def calculate_quality_score(self, content: Dict) -> float:
        """
        Calculate comprehensive quality score (0-1).

        Args:
            content: Content document

        Returns:
            Quality score (0-1)
        """
        score = 0.0

        # 1. Content length (0-0.25 points)
        score += self._score_length(content) * 0.25

        # 2. Structure (0-0.20 points)
        score += self._score_structure(content) * 0.20

        # 3. Readability (0-0.20 points)
        score += self._score_readability(content) * 0.20

        # 4. Source reputation (0-0.20 points)
        score += self._score_source_reputation(content) * 0.20

        # 5. Freshness (0-0.15 points)
        score += self._score_freshness(content) * 0.15

        return min(score, 1.0)

    def _score_length(self, content: Dict) -> float:
        """
        Score based on content length.
        Ideal: 300-2000 words
        """
        word_count = content.get("metadata", {}).get("wordCount", 0)

        if word_count < 100:
            return 0.0
        elif word_count < 300:
            return word_count / 300 * 0.5  # Linear 0-0.5
        elif 300 <= word_count <= 2000:
            return 1.0  # Ideal range
        elif word_count > 2000:
            # Gradual penalty for very long articles
            return max(0.5, 1.0 - (word_count - 2000) / 5000)
        else:
            return 0.0

    def _score_structure(self, content: Dict) -> float:
        """
        Score based on content structure (headers, lists, paragraphs).
        """
        text = content.get("content", "")
        if not text:
            return 0.0

        score = 0.0

        # Has headers (0.4 points)
        has_headers = bool(re.search(r'^#+\s', text, re.MULTILINE))
        if has_headers:
            score += 0.4

        # Has lists (0.3 points)
        has_lists = bool(re.search(r'^[\*\-\+]\s', text, re.MULTILINE))
        if has_lists:
            score += 0.3

        # Paragraph count (0.3 points)
        paragraphs = [p for p in text.split('\n\n') if len(p.strip()) > 50]
        if len(paragraphs) >= 3:
            score += 0.3
        elif len(paragraphs) >= 2:
            score += 0.15

        return min(score, 1.0)

    def _score_readability(self, content: Dict) -> float:
        """
        Score based on readability metrics.
        """
        text = content.get("content", "")
        if not text:
            return 0.0

        score = 0.0

        # Average sentence length (ideal: 15-25 words)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

        if sentences:
            avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)

            if 15 <= avg_sentence_length <= 25:
                score += 0.4  # Ideal range
            elif 10 <= avg_sentence_length < 15:
                score += 0.3  # Slightly short
            elif 25 < avg_sentence_length <= 35:
                score += 0.3  # Slightly long
            else:
                score += 0.1  # Too short or too long

        # Has images (0.2 points)
        if content.get("images"):
            score += 0.2

        # Title quality (0.4 points)
        title = content.get("title", "")
        if title:
            title_words = len(title.split())
            if 5 <= title_words <= 15:
                score += 0.4
            elif 3 <= title_words < 5 or 15 < title_words <= 20:
                score += 0.2
            else:
                score += 0.1

        return min(score, 1.0)

    def _score_source_reputation(self, content: Dict) -> float:
        """
        Score based on source domain reputation.
        Based on historical quality of articles from this source.
        """
        domain = content.get("sourceDomain", "")
        if not domain:
            return 0.5  # Neutral

        # Check cache
        if domain in self.source_reputation_cache:
            return self.source_reputation_cache[domain]

        try:
            # Calculate reputation from historical data
            pipeline = [
                {"$match": {
                    "sourceDomain": domain,
                    "status": {"$in": ["posted", "enriched"]}
                }},
                {"$group": {
                    "_id": None,
                    "avg_quality": {"$avg": "$qualityScore"},
                    "count": {"$sum": 1}
                }}
            ]

            result = list(self.content_collection.aggregate(pipeline))

            if result and result[0]["count"] >= 5:
                # Have enough data for reputation
                reputation = result[0]["avg_quality"]
            else:
                # Not enough data, neutral
                reputation = 0.5

            # Cache for 1 hour (in-memory only)
            self.source_reputation_cache[domain] = reputation

            return reputation

        except Exception as e:
            logger.warning(f"Source reputation calculation failed for {domain}: {e}")
            return 0.5  # Neutral on error

    def _score_freshness(self, content: Dict) -> float:
        """
        Score based on content freshness.
        Newer content scores higher.
        """
        published_at = content.get("metadata", {}).get("publishedAt")
        scraped_at = content.get("scrapedAt")

        # Use published date if available, otherwise scraped date
        date = published_at or scraped_at

        if not date:
            return 0.5  # Neutral if no date

        try:
            # Convert to datetime if string
            if isinstance(date, str):
                from dateutil import parser
                date = parser.parse(date)

            # Calculate age in days
            age_days = (datetime.utcnow() - date).days

            # Scoring by age
            if age_days <= 1:
                return 1.0  # Today
            elif age_days <= 3:
                return 0.9  # Very recent
            elif age_days <= 7:
                return 0.7  # Last week
            elif age_days <= 14:
                return 0.5  # Last 2 weeks
            elif age_days <= 30:
                return 0.3  # Last month
            else:
                return 0.1  # Older

        except Exception as e:
            logger.warning(f"Freshness scoring failed: {e}")
            return 0.5

    def update_source_reputation(self, domain: str):
        """
        Force update source reputation cache for domain.

        Args:
            domain: Source domain
        """
        if domain in self.source_reputation_cache:
            del self.source_reputation_cache[domain]

    def get_quality_metrics(self, content: Dict) -> Dict:
        """
        Get detailed quality metrics breakdown.

        Args:
            content: Content document

        Returns:
            Dict with metric breakdowns
        """
        return {
            "length_score": self._score_length(content),
            "structure_score": self._score_structure(content),
            "readability_score": self._score_readability(content),
            "source_reputation": self._score_source_reputation(content),
            "freshness_score": self._score_freshness(content),
            "overall_score": self.calculate_quality_score(content)
        }


# Singleton
_scorer = None


def get_quality_scorer() -> QualityScorer:
    """Get or create quality scorer singleton"""
    global _scorer
    if _scorer is None:
        _scorer = QualityScorer()
    return _scorer
