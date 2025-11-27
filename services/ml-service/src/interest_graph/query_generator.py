"""
Generate search queries for content discovery using LLM.
"""

import logging
from typing import List, Dict
import google.generativeai as genai
from src.config import settings

logger = logging.getLogger(__name__)


class QueryGenerator:
    """
    Generates search queries and RSS feed discovery queries using Gemini.
    """

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash-latest')

    def generate_queries_for_topic(self, topic: str, count: int = 5) -> List[str]:
        """
        Generate search queries for discovering content about a topic.

        Args:
            topic: Topic name (e.g., "Machine Learning", "Sustainable Fashion")
            count: Number of queries to generate

        Returns:
            List of search query strings
        """
        try:
            prompt = f"""Generate {count} specific search queries to discover RSS feeds and content about "{topic}".

Requirements:
- Queries should find blogs, news sites, and RSS feeds
- Include variations (academic, news, community, industry)
- Be specific and targeted
- Format: One query per line, no numbering

Topic: {topic}

Queries:"""

            response = self.model.generate_content(prompt)
            text = response.text.strip()

            # Parse queries (one per line)
            queries = [q.strip() for q in text.split('\n') if q.strip() and not q.strip().startswith('#')]

            # Remove numbering if present
            queries = [q.split('. ', 1)[-1] if '. ' in q else q for q in queries]

            logger.info(f"Generated {len(queries)} queries for topic: {topic}")
            return queries[:count]

        except Exception as e:
            logger.error(f"Query generation failed for {topic}: {e}")
            return [f"{topic} RSS feed", f"{topic} blog"]

    def generate_rss_search_queries(self, topic: str) -> List[str]:
        """
        Generate queries specifically for finding RSS feeds.

        Args:
            topic: Topic name

        Returns:
            List of RSS-focused queries
        """
        # Simple template-based for efficiency
        queries = [
            f"{topic} RSS feed",
            f"{topic} blog RSS",
            f"best {topic} RSS feeds",
            f"{topic} news RSS",
            f"{topic} feed aggregator"
        ]

        return queries

    def suggest_category_name(self, topic: str, related_topics: List[str] = None) -> str:
        """
        Suggest a category name for a detected topic.

        Args:
            topic: Main topic
            related_topics: Related topics/keywords

        Returns:
            Suggested category name
        """
        try:
            related = ', '.join(related_topics) if related_topics else 'none'

            prompt = f"""Suggest a concise category name for this topic cluster.

Main topic: {topic}
Related: {related}

Requirements:
- 1-3 words maximum
- Title case
- Broad enough to encompass related topics
- Professional and clear

Category name:"""

            response = self.model.generate_content(prompt)
            category_name = response.text.strip().strip('"').strip("'")

            logger.info(f"Suggested category: {category_name} for topic: {topic}")
            return category_name

        except Exception as e:
            logger.error(f"Category naming failed: {e}")
            return topic

    def batch_generate_queries(self, topics: List[str], queries_per_topic: int = 3) -> Dict[str, List[str]]:
        """
        Generate queries for multiple topics efficiently.

        Args:
            topics: List of topic names
            queries_per_topic: Queries per topic

        Returns:
            Dict mapping topic -> queries
        """
        result = {}

        for topic in topics:
            result[topic] = self.generate_queries_for_topic(topic, queries_per_topic)

        return result


# Singleton
_generator = None


def get_query_generator() -> QueryGenerator:
    """Get or create query generator singleton"""
    global _generator
    if _generator is None:
        _generator = QueryGenerator()
    return _generator
