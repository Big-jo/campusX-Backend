import logging
import feedparser
from typing import List, Dict
from datetime import datetime, timedelta
from urllib.parse import urlparse
from src.search.content_source import ContentSource
import google.generativeai as genai
from src.config import settings

logger = logging.getLogger(__name__)

# Initialize Gemini for smart category mapping
genai.configure(api_key=settings.GEMINI_API_KEY)

# Curated RSS feeds covering interest categories
RSS_FEEDS = {
    "technology": [
        "https://techcabal.com/feed/",
        "https://techpoint.africa/feed/",
        "https://technext.ng/feed/",
        "https://techeconomy.ng/feed/",
        "https://disrupt-africa.com/feed/",
        "https://www.theverge.com/rss/index.xml",
        "https://techcrunch.com/feed/",
        "https://arstechnica.com/feed/",
    ],
    "business": [
        "https://nairametrics.com/feed/",
        "https://businessday.ng/feed/",
        "https://www.ventures-africa.com/feed/",
    ],
    "news": [
        "https://www.thecable.ng/feed",
        "https://www.premiumtimesng.com/feed",
        "https://punchng.com/feed/",
        "https://www.vanguardngr.com/feed/",
    ],
    "startup": [
        "https://techcabal.com/category/startup/feed/",
        "https://techpoint.africa/category/startups/feed/",
    ],
    "finance": [
        "https://nairametrics.com/category/economy/feed/",
        "https://businessday.ng/category/markets/feed/",
    ],
    "fashion_beauty": [
        "https://www.vogue.com/feed/rss",
        "https://www.elle.com/rss/all.xml/",
        "https://www.refinery29.com/en-us/rss.xml",
        "https://fashionista.com/feed",
    ],
    "animals": [
        "https://www.animalplanet.com/feed",
        "https://www.earthtouchnews.com/feed/",
        "https://www.boredpanda.com/category/animals/feed/",
    ],
    "sports_fitness": [
        "https://www.goal.com/en/feeds/news",
        "https://www.espn.com/espn/rss/news",
        "https://www.menshealth.com/rss/all.xml/",
        "https://www.bodybuilding.com/rss/latest-articles.xml",
        "https://completesports.com/feed/",
    ],
    "entertainment": [
        "https://www.rottentomatoes.com/feed/",
        "https://deadline.com/feed/",
        "https://variety.com/feed/",
        "https://www.polygon.com/rss/index.xml",
        "https://www.billboard.com/feed/",
        "https://www.nme.com/feed",
    ],
    "food_cooking": [
        "https://www.bonappetit.com/feed/rss",
        "https://www.seriouseats.com/feeds/recipe",
        "https://www.foodnetwork.com/feeds/all-recipes.rss",
        "https://smittenkitchen.com/feed/",
    ],
    "travel": [
        "https://www.lonelyplanet.com/feeds/blog",
        "https://www.travelandleisure.com/rss",
        "https://www.nomadicmatt.com/feed/",
        "https://www.cntraveler.com/feed/rss",
    ],
    "arts_creativity": [
        "https://www.artsy.net/rss/news",
        "https://www.creativebloq.com/feed",
        "https://mymodernmet.com/feed/",
        "https://www.designboom.com/feeds/",
    ],
    "academics": [
        "https://www.chronicle.com/section/news/6/rss",
        "https://www.insidehighered.com/rss.xml",
        "https://scienceblog.com/feed/",
    ],
    "transportation": [
        "https://www.caranddriver.com/rss/all.xml/",
        "https://www.roadandtrack.com/rss/all.xml/",
        "https://www.motorcyclistonline.com/rss/all.xml/",
    ],
}


class RSSAggregator(ContentSource):
    """
    Aggregate content from RSS feeds with Gemini-powered intelligent filtering
    """

    def __init__(self):
        self.feeds = RSS_FEEDS
        self.gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        self._category_cache = {}  # Cache Gemini category mappings

    def search(
        self, interest_category: str, keywords: List[str], limit: int = 10
    ) -> List[Dict[str, str]]:
        """
        Get recent articles from RSS feeds matching interest category

        Args:
            interest_category: Interest category name
            keywords: Keywords to filter articles (optional)
            limit: Maximum URLs to return

        Returns:
            List of dicts with 'url' and 'title' keys
        """
        # Use Gemini to intelligently map category to RSS feeds
        feed_categories = self._get_relevant_feed_categories(interest_category, keywords)

        logger.info(f"Mapped '{interest_category}' to feed categories: {feed_categories}")

        # Collect feed URLs from mapped categories
        feed_urls = []
        for category in feed_categories:
            feed_urls.extend(self.feeds.get(category, []))

        # Fallback to tech if no feeds found
        if not feed_urls:
            feed_urls = self.feeds.get("technology", [])
            logger.warning(f"No feeds found for {interest_category}, using technology feeds")

        logger.info(f"Fetching {len(feed_urls)} RSS feeds for {interest_category}")

        # Collect articles from all feeds
        all_articles = []
        for feed_url in feed_urls:
            articles = self._fetch_feed(feed_url, keywords)
            all_articles.extend(articles)

        # Use Gemini to rank/filter articles by relevance
        if all_articles and keywords:
            all_articles = self._rank_articles_by_relevance(
                all_articles, interest_category, keywords
            )

        # Sort by published date (newest first)
        all_articles.sort(key=lambda x: x.get("published", 0), reverse=True)

        # Remove duplicates by URL
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            if article["url"] not in seen_urls:
                seen_urls.add(article["url"])
                unique_articles.append(article)

        # Return top N
        results = unique_articles[:limit]

        logger.info(f"Found {len(results)} unique articles from RSS feeds")

        return results

    def _fetch_feed(self, feed_url: str, keywords: List[str]) -> List[Dict[str, str]]:
        """
        Fetch and parse single RSS feed

        Args:
            feed_url: RSS feed URL
            keywords: Keywords to filter (optional)

        Returns:
            List of articles
        """
        try:
            # Parse RSS feed
            feed = feedparser.parse(feed_url)

            if feed.bozo and not feed.entries:
                logger.warning(f"Failed to parse feed: {feed_url}")
                return []

            articles = []

            # Filter recent articles (last 30 days)
            cutoff_date = datetime.now() - timedelta(days=30)

            for entry in feed.entries[:20]:  # Limit per feed
                try:
                    # Get URL
                    url = entry.get("link")
                    if not url:
                        continue

                    # Get title
                    title = entry.get("title", "")

                    # Get published date
                    published = entry.get("published_parsed") or entry.get("updated_parsed")
                    published_dt = datetime(*published[:6]) if published else datetime.now()

                    # Skip old articles
                    if published_dt < cutoff_date:
                        continue

                    # Filter by keywords (if provided)
                    if keywords:
                        text = (title + " " + entry.get("summary", "")).lower()
                        if not any(keyword.lower() in text for keyword in keywords):
                            continue

                    articles.append({
                        "url": url,
                        "title": title,
                        "published": published_dt.timestamp(),
                    })

                except Exception as e:
                    logger.warning(f"Failed to parse entry from {feed_url}: {e}")
                    continue

            logger.info(f"Fetched {len(articles)} articles from {feed_url}")
            return articles

        except Exception as e:
            logger.error(f"Failed to fetch RSS feed {feed_url}: {e}")
            return []

    def _get_relevant_feed_categories(
        self, interest_category: str, keywords: List[str]
    ) -> List[str]:
        """
        Use Gemini to map interest category and keywords to relevant RSS feed categories

        Args:
            interest_category: Interest category name
            keywords: List of keywords

        Returns:
            List of relevant RSS feed category keys
        """
        # Check cache first
        cache_key = f"{interest_category}:{','.join(sorted(keywords[:3]))}"
        if cache_key in self._category_cache:
            return self._category_cache[cache_key]

        # Direct match
        category_lower = interest_category.lower()
        if category_lower in self.feeds:
            self._category_cache[cache_key] = [category_lower]
            return [category_lower]

        try:
            # Use Gemini to map
            available_categories = list(self.feeds.keys())
            keywords_str = ", ".join(keywords[:5]) if keywords else "general"

            prompt = f"""Given the interest category "{interest_category}" and keywords [{keywords_str}],
map it to the MOST RELEVANT RSS feed categories from this list: {', '.join(available_categories)}.

Return 1-3 categories in order of relevance. Response format:
category1, category2, category3

Only return category names from the provided list, comma-separated."""

            response = self.gemini_model.generate_content(prompt)
            categories = [c.strip() for c in response.text.strip().split(",")]

            # Validate categories
            valid_categories = [c for c in categories if c in self.feeds]

            if not valid_categories:
                valid_categories = ["technology"]  # Fallback

            self._category_cache[cache_key] = valid_categories
            return valid_categories

        except Exception as e:
            logger.error(f"Gemini category mapping failed: {e}")
            # Fallback to technology
            return ["technology"]

    def _rank_articles_by_relevance(
        self, articles: List[Dict[str, str]], interest_category: str, keywords: List[str]
    ) -> List[Dict[str, str]]:
        """
        Use Gemini to score article relevance and filter low-quality content

        Args:
            articles: List of articles with url, title
            interest_category: Interest category
            keywords: Keywords

        Returns:
            Filtered and scored articles
        """
        if not articles or len(articles) <= 3:
            return articles

        try:
            # Prepare article summaries for Gemini
            article_summaries = []
            for i, article in enumerate(articles[:20]):  # Limit to 20 for token efficiency
                article_summaries.append(f"{i}. {article['title']}")

            keywords_str = ", ".join(keywords[:5]) if keywords else "general"
            articles_text = "\n".join(article_summaries)

            prompt = f"""Score these articles for relevance to "{interest_category}" with keywords [{keywords_str}].

Articles:
{articles_text}

Return only the article numbers (0-indexed) that are HIGHLY RELEVANT, comma-separated.
Example: 0,2,5,8
Exclude clickbait, spam, or off-topic articles."""

            response = self.gemini_model.generate_content(prompt)

            # Parse relevant article indices
            try:
                relevant_indices = [int(i.strip()) for i in response.text.strip().split(",")]
                # Filter articles
                filtered = [articles[i] for i in relevant_indices if i < len(articles)]

                logger.info(f"Gemini filtered {len(articles)} -> {len(filtered)} articles")
                return filtered if filtered else articles[:10]

            except ValueError:
                logger.warning("Failed to parse Gemini ranking response")
                return articles

        except Exception as e:
            logger.error(f"Gemini article ranking failed: {e}")
            return articles

    def add_feed(self, category: str, feed_url: str):
        """Add a new RSS feed to a category"""
        if category not in self.feeds:
            self.feeds[category] = []

        if feed_url not in self.feeds[category]:
            self.feeds[category].append(feed_url)
            logger.info(f"Added feed {feed_url} to {category}")


# Global instance
_aggregator = None


def get_rss_aggregator() -> RSSAggregator:
    """Get or create RSSAggregator singleton"""
    global _aggregator
    if _aggregator is None:
        _aggregator = RSSAggregator()
    return _aggregator
