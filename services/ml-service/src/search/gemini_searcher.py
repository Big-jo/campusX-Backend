import google.generativeai as genai
from typing import List, Dict
from urllib.parse import urlparse
import logging
from src.config import settings
from src.search.content_source import ContentSource

logger = logging.getLogger(__name__)

# Initialize Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

# Blocked domains (social media, paywalls, etc.)
BLOCKED_DOMAINS = {
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "tiktok.com",
    "linkedin.com",
    "reddit.com",
    "pinterest.com",
    "youtube.com",  # May allow later for video content
    "nytimes.com",  # Paywall
    "wsj.com",  # Paywall
    "ft.com",  # Paywall
}


def extract_domain(url: str) -> str:
    """Extract domain from URL"""
    parsed = urlparse(url)
    domain = parsed.netloc
    # Remove www. prefix
    if domain.startswith("www."):
        domain = domain[4:]
    return domain


def is_blocked_domain(url: str) -> bool:
    """Check if URL is from a blocked domain"""
    domain = extract_domain(url)
    return domain in BLOCKED_DOMAINS


class GeminiSearcher(ContentSource):
    """
    Use Gemini API to search for quality content sources
    based on interest categories and keywords
    """

    def __init__(self):
        self.model = genai.GenerativeModel("gemini-2.5-flash")

    def search(
        self, interest_category: str, keywords: List[str], limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Search for quality URLs related to interest category

        Args:
            interest_category: Interest category name (e.g., "Technology")
            keywords: List of keywords to search for
            limit: Maximum number of URLs to return

        Returns:
            List of dicts with 'url' and 'title' keys
        """
        try:
            # Construct search prompt
            prompt = self._build_search_prompt(interest_category, keywords, limit)

            # Generate response
            response = self.model.generate_content(prompt)

            # Parse URLs from response
            urls = self._parse_urls_from_response(response.text)

            # Filter blocked domains
            filtered_urls = [url for url in urls if not is_blocked_domain(url["url"])]

            logger.info(
                f"Found {len(filtered_urls)} URLs for {interest_category} "
                f"(filtered from {len(urls)})"
            )

            return filtered_urls[:limit]

        except Exception as e:
            logger.error(f"Gemini search failed for {interest_category}: {e}")
            return []

    def _build_search_prompt(
        self, interest_category: str, keywords: List[str], limit: int
    ) -> str:
        """Build prompt for Gemini to find quality sources"""
        keywords_str = ", ".join(keywords[:5])  # Use top 5 keywords

        prompt = f"""You are a content discovery assistant specializing in Nigerian content. Find {limit} REAL, CURRENTLY ACCESSIBLE, LEGALLY SCRAPABLE URLs with actual content about "{interest_category}" from Nigerian or Africa-focused sources.

Focus on these topics: {keywords_str}

CRITICAL Requirements:
- URLs MUST be real, existing pages that are currently accessible (not 404s)
- URLs MUST contain actual readable article/blog content (not just homepages or category pages)
- URLs MUST be direct links to specific articles/posts with substantial text content
- URLs MUST be from sites that allow web scraping (check robots.txt policies)
- URLs MUST be legally scrapable - public content without terms prohibiting scraping
- Verify URLs are from established, active websites with real content
- PRIORITIZE Nigerian sources: Nigerian news sites, blogs, tech platforms, educational institutions, startups, local publications
- Also include: Pan-African content platforms, African tech blogs, regional news sites
- Examples of good sources: TechCabal, Techpoint Africa, Nairametrics, BusinessDay NG, The Cable, Premium Times, local university sites, Nigerian startup blogs
- EXCLUDE: social media (Facebook, Twitter, Instagram, TikTok, LinkedIn, Reddit, Pinterest)
- EXCLUDE: paywalled sites (NYTimes, WSJ, Financial Times, Medium member-only)
- EXCLUDE: video-only sites (YouTube, Vimeo)
- EXCLUDE: sites with strict anti-scraping policies or legal restrictions
- EXCLUDE: dead links, archived pages, or sites that frequently go offline
- Prefer well-structured HTML content (not heavy JavaScript SPAs or dynamic sites)
- Each URL must be from a different domain
- Prefer recent content (within last year) from actively maintained sites
- Focus on content relevant to Nigerian/African audience and context

Format your response EXACTLY as:
URL: https://example.com/article-1
Title: Article Title
---
URL: https://example.com/article-2
Title: Article Title
---

Do not include any other text or explanations. Only provide URLs you are confident exist, contain scrapable content, and are legally accessible for scraping."""

        return prompt

    def _parse_urls_from_response(self, response_text: str) -> List[Dict[str, str]]:
        """
        Parse URLs and titles from Gemini response

        Expected format:
        URL: https://example.com/article
        Title: Article Title
        ---
        """
        results = []

        # Split by --- separator
        blocks = response_text.strip().split("---")

        for block in blocks:
            lines = block.strip().split("\n")

            url = None
            title = None

            for line in lines:
                line = line.strip()
                if line.startswith("URL:"):
                    url = line[4:].strip()
                elif line.startswith("Title:"):
                    title = line[6:].strip()

            if url and title:
                results.append({"url": url, "title": title})

        return results


# Global instance
_searcher = None


def get_searcher() -> GeminiSearcher:
    """Get or create GeminiSearcher singleton"""
    global _searcher
    if _searcher is None:
        _searcher = GeminiSearcher()
    return _searcher
