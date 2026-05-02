"""
LLM-powered search query generator.
Generates optimized Google search queries for content discovery.
"""

import logging
from typing import List, Optional
from src.llm.deepseek_client import generate

logger = logging.getLogger(__name__)


class QueryGenerator:
    """
    Generates optimized search queries using DeepSeek.
    """

    def generate_query_for_category(
        self, category: str, keywords: Optional[List[str]] = None
    ) -> str:
        """
        Generate optimized search query for a category.

        Args:
            category: Interest category name
            keywords: Optional keywords for context

        Returns:
            Optimized search query string
        """
        try:
            keywords_str = ", ".join(keywords) if keywords else "N/A"

            prompt = f"""Generate ONE optimized Google search query for discovering content about "{category} if relevant to Nigerian/African sources include location".

Context keywords: {keywords_str}

Requirements:
- Nigerian/African sources preferred for relevant content
- Recent articles (last 30 days or as recent as possible)
- Avoid paywalls/social media
- Highly specific, one query only

Output: Just the query text, no explanation."""

            query = generate(prompt, temperature=0.7, max_tokens=100)
            logger.info(f"Generated query for '{category}': {query}")
            return query

        except Exception as e:
            logger.error(f"Query generation failed for {category}: {e}")
            fallback = f"{category} news articles Nigeria"
            logger.warning(f"Using fallback query: {fallback}")
            return fallback

    def refine_query_based_on_performance(
        self, query: str, performance_data: dict
    ) -> str:
        """
        Refine existing query based on performance metrics.

        Args:
            query: Current query text
            performance_data: Dict with success_rate, avg_results, etc.

        Returns:
            Refined query string
        """
        try:
            success_rate = performance_data.get("success_rate", 0)
            avg_results = performance_data.get("avg_results_per_search", 0)

            prompt = f"""Improve this Google search query: "{query}"

Performance metrics:
- Success rate: {success_rate:.1%}
- Average results: {avg_results:.1f}

Goal: Generate a better query that increases result count and quality.

Requirements:
- Keep focus on Nigerian/African content
- Make it more specific if too broad (low success rate)
- Make it broader if too narrow (few results)

Output: Just the improved query text."""

            refined_query = generate(prompt, temperature=0.7, max_tokens=100)
            logger.info(f"Refined query: '{query}' → '{refined_query}'")
            return refined_query

        except Exception as e:
            logger.error(f"Query refinement failed: {e}")
            return query  # Return original on failure


# Singleton
_search_query_generator = None


def get_query_generator() -> QueryGenerator:
    """Get or create generator singleton"""
    global _search_query_generator
    if _search_query_generator is None:
        _search_query_generator = QueryGenerator()
    return _search_query_generator


# Backwards-compat alias for any remaining references
get_gemini_query_generator = get_query_generator
GeminiQueryGenerator = QueryGenerator
