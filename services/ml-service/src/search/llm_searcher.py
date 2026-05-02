import logging
from typing import List, Dict
from urllib.parse import urlparse
from src.search.content_source import ContentSource
from src.llm.deepseek_client import generate

logger = logging.getLogger(__name__)

BLOCKED_DOMAINS = {
    "facebook.com", "twitter.com", "x.com", "instagram.com", "tiktok.com",
    "linkedin.com", "reddit.com", "pinterest.com", "youtube.com",
    "nytimes.com", "wsj.com", "ft.com",
}


def extract_domain(url: str) -> str:
    domain = urlparse(url).netloc
    return domain[4:] if domain.startswith("www.") else domain


def is_blocked_domain(url: str) -> bool:
    return extract_domain(url) in BLOCKED_DOMAINS


class LLMSearcher(ContentSource):
    """
    Use DeepSeek to discover quality content sources for interest categories.
    """

    def search(
        self, interest_category: str, keywords: List[str], limit: int = 10
    ) -> List[Dict[str, str]]:
        try:
            prompt = self._build_search_prompt(interest_category, keywords, limit)
            response_text = generate(prompt, temperature=0.7, max_tokens=2048)
            urls = self._parse_urls_from_response(response_text)
            filtered_urls = [url for url in urls if not is_blocked_domain(url["url"])]

            logger.info(
                f"Found {len(filtered_urls)} URLs for {interest_category} "
                f"(filtered from {len(urls)})"
            )
            return filtered_urls[:limit]

        except Exception as e:
            logger.error(f"LLM search failed for {interest_category}: {e}")
            return []

    def _build_search_prompt(
        self, interest_category: str, keywords: List[str], limit: int
    ) -> str:
        keywords_str = ", ".join(keywords[:5])
        return f"""You are a content discovery assistant specializing in Nigerian content. Find {limit} REAL, CURRENTLY ACCESSIBLE, LEGALLY SCRAPABLE URLs with actual content about "{interest_category}" from Nigerian or Africa-focused sources.

Focus on these topics: {keywords_str}

CRITICAL Requirements:
- URLs MUST be real, existing pages that are currently accessible (not 404s)
- URLs MUST contain actual readable article/blog content (not just homepages or category pages)
- URLs MUST be direct links to specific articles/posts with substantial text content
- URLs MUST be from sites that allow web scraping (check robots.txt policies)
- PRIORITIZE Nigerian sources: Nigerian news sites, blogs, tech platforms, educational institutions, startups, local publications
- Also include: Pan-African content platforms, African tech blogs, regional news sites
- Examples of good sources: TechCabal, Techpoint Africa, Nairametrics, BusinessDay NG, The Cable, Premium Times, local university sites, Nigerian startup blogs
- EXCLUDE: social media (Facebook, Twitter, Instagram, TikTok, LinkedIn, Reddit, Pinterest)
- EXCLUDE: paywalled sites (NYTimes, WSJ, Financial Times, Medium member-only)
- EXCLUDE: video-only sites (YouTube, Vimeo)
- Each URL must be from a different domain

Format your response EXACTLY as:
URL: https://example.com/article-1
Title: Article Title
---
URL: https://example.com/article-2
Title: Article Title
---

Do not include any other text or explanations."""

    def _parse_urls_from_response(self, response_text: str) -> List[Dict[str, str]]:
        results = []
        for block in response_text.strip().split("---"):
            url = None
            title = None
            for line in block.strip().split("\n"):
                line = line.strip()
                if line.startswith("URL:"):
                    url = line[4:].strip()
                elif line.startswith("Title:"):
                    title = line[6:].strip()
            if url and title:
                results.append({"url": url, "title": title})
        return results


# Singleton
_llm_searcher = None


def get_llm_searcher() -> LLMSearcher:
    """Get or create LLMSearcher singleton"""
    global _llm_searcher
    if _llm_searcher is None:
        _llm_searcher = LLMSearcher()
    return _llm_searcher


# Backwards-compat aliases
get_searcher = get_llm_searcher
GeminiSearcher = LLMSearcher
