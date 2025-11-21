import logging
from typing import Dict, Optional
from urllib.parse import urlparse, urljoin
import time
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from src.config import settings

logger = logging.getLogger(__name__)

# Domain rate limiting (last request time per domain)
_domain_last_request: Dict[str, float] = {}


class ContentScraper:
    """
    Web scraper using BeautifulSoup4 for static sites
    and Playwright for JavaScript-heavy sites
    """

    def __init__(self):
        self.session = requests.Session()
        # Use realistic browser headers to avoid bot detection
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0",
        })
        # Add cookies to appear more legitimate
        self.session.cookies.set("lang", "en")

    def scrape(self, url: str, use_playwright: bool = False) -> Optional[Dict]:
        """
        Scrape content from URL

        Args:
            url: URL to scrape
            use_playwright: Force Playwright for JS-heavy sites

        Returns:
            Dict with keys: url, title, content_html, images, metadata
            Returns None if scraping fails
        """
        domain = self._extract_domain(url)

        # Rate limiting per domain
        self._rate_limit(domain)

        try:
            if use_playwright:
                return self._scrape_with_playwright(url)
            else:
                return self._scrape_with_requests(url)

        except Exception as e:
            logger.error(f"Scraping failed for {url}: {e}")
            return None

    def _scrape_with_requests(self, url: str) -> Optional[Dict]:
        """Scrape using requests + BeautifulSoup (for static sites)"""
        try:
            # Add Referer header to appear as natural browsing
            headers = {}
            from urllib.parse import urlparse
            parsed = urlparse(url)
            headers["Referer"] = f"{parsed.scheme}://{parsed.netloc}/"

            response = self.session.get(
                url,
                timeout=settings.SCRAPER_TIMEOUT,
                allow_redirects=True,
                headers=headers
            )

            # Handle bot protection / rate limiting
            if response.status_code == 403:
                logger.warning(f"403 Forbidden for {url}, trying Playwright")
                return self._scrape_with_playwright(url)
            elif response.status_code == 429:
                logger.warning(f"429 Rate Limited for {url}, skipping")
                return None

            response.raise_for_status()

            soup = BeautifulSoup(response.content, "lxml")

            # Extract content
            content = self._extract_content(soup, url)

            if not content:
                logger.warning(f"No content extracted from {url}, trying Playwright")
                return self._scrape_with_playwright(url)

            return content

        except requests.RequestException as e:
            logger.error(f"Requests scraping failed for {url}: {e}")
            # Fallback to Playwright for network errors
            return self._scrape_with_playwright(url)

    def _scrape_with_playwright(self, url: str) -> Optional[Dict]:
        """Scrape using Playwright (for JavaScript-heavy sites)"""
        browser = None
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--disable-dev-shm-usage',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-web-security',
                    ]
                )

                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    viewport={'width': 1920, 'height': 1080},
                    locale='en-US',
                    timezone_id='America/New_York',
                    permissions=['geolocation'],
                    extra_http_headers={
                        'Accept-Language': 'en-US,en;q=0.9',
                    }
                )

                # Inject script to remove webdriver property
                context.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                """)

                page = context.new_page()

                # Navigate with timeout
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=settings.SCRAPER_TIMEOUT * 1000)
                    # Give JS time to render (if needed)
                    page.wait_for_timeout(2000)
                except PlaywrightTimeout:
                    logger.warning(f"Timeout loading {url}, attempting to extract anyway")
                except Exception as e:
                    logger.error(f"Navigation error for {url}: {e}")
                    raise

                # Wait for content to load (optional)
                try:
                    page.wait_for_selector("article, main, .content, #content, body", timeout=5000)
                except PlaywrightTimeout:
                    pass  # Continue anyway

                # Get HTML before closing anything
                html = page.content()

                # Parse while browser still open
                soup = BeautifulSoup(html, "lxml")
                result = self._extract_content(soup, url)

                # Clean up
                page.close()
                context.close()
                browser.close()

                return result

        except Exception as e:
            logger.error(f"Playwright scraping failed for {url}: {e}")
            if browser:
                try:
                    browser.close()
                except:
                    pass
            return None

    def _extract_content(self, soup: BeautifulSoup, base_url: str) -> Optional[Dict]:
        """Extract title, content, images from BeautifulSoup object"""

        # Remove script, style, nav, footer, ads
        for element in soup(["script", "style", "nav", "footer", "aside", "header", "iframe"]):
            element.decompose()

        # Extract title
        title = self._extract_title(soup)
        if not title:
            return None

        # Extract main content
        content_html = self._extract_main_content(soup)
        if not content_html:
            return None

        # Extract images
        images = self._extract_images(soup, base_url)

        # Extract metadata
        metadata = self._extract_metadata(soup)

        return {
            "url": base_url,
            "title": title,
            "content_html": str(content_html),
            "images": images,
            "metadata": metadata,
        }

    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract article title"""
        # Try common patterns
        selectors = [
            ("h1", None),
            ("meta", {"property": "og:title"}),
            ("meta", {"name": "twitter:title"}),
            ("title", None),
        ]

        for tag, attrs in selectors:
            if attrs:
                elem = soup.find(tag, attrs=attrs)
                if elem and elem.get("content"):
                    return elem.get("content").strip()
            else:
                elem = soup.find(tag)
                if elem and elem.text:
                    return elem.text.strip()

        return None

    def _extract_main_content(self, soup: BeautifulSoup) -> Optional[BeautifulSoup]:
        """Extract main article content"""
        # Try common content selectors
        selectors = [
            "article",
            "main",
            ".article-content",
            ".post-content",
            ".entry-content",
            "#content",
            ".content",
            '[role="main"]',
        ]

        for selector in selectors:
            content = soup.select_one(selector)
            if content and len(content.text.strip()) > 100:
                return content

        # Fallback: find largest text block
        paragraphs = soup.find_all("p")
        if paragraphs and sum(len(p.text) for p in paragraphs) > 200:
            # Wrap in div
            wrapper = soup.new_tag("div")
            for p in paragraphs:
                wrapper.append(p)
            return wrapper

        return None

    def _extract_images(self, soup: BeautifulSoup, base_url: str) -> list:
        """Extract image URLs (convert to absolute URLs)"""
        images = []

        # Find images in main content
        img_tags = soup.find_all("img", src=True)

        for img in img_tags[:10]:  # Limit to 10 images
            src = img.get("src")
            if not src:
                continue

            # Convert to absolute URL
            absolute_url = urljoin(base_url, src)

            # Filter out small images (likely icons)
            width = img.get("width")
            if width and int(width) < 200:
                continue

            images.append(absolute_url)

        return images

    def _extract_metadata(self, soup: BeautifulSoup) -> Dict:
        """Extract metadata (author, publish date, etc.)"""
        metadata = {}

        # Author
        author_selectors = [
            ("meta", {"name": "author"}),
            ("meta", {"property": "article:author"}),
            (".author", None),
            (".byline", None),
        ]

        for tag, attrs in author_selectors:
            if attrs:
                elem = soup.find(tag, attrs=attrs)
                if elem and elem.get("content"):
                    metadata["author"] = elem.get("content").strip()
                    break
            else:
                elem = soup.select_one(tag)
                if elem and elem.text:
                    metadata["author"] = elem.text.strip()
                    break

        # Published date
        date_selectors = [
            ("meta", {"property": "article:published_time"}),
            ("meta", {"name": "publish_date"}),
            ("time", {"datetime": True}),
        ]

        for tag, attrs in date_selectors:
            elem = soup.find(tag, attrs=attrs)
            if elem:
                date = elem.get("content") or elem.get("datetime") or elem.text
                if date:
                    metadata["publishedAt"] = date.strip()
                    break

        return metadata

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        parsed = urlparse(url)
        return parsed.netloc

    def _rate_limit(self, domain: str):
        """Enforce rate limiting per domain"""
        last_request = _domain_last_request.get(domain, 0)
        elapsed = time.time() - last_request

        if elapsed < settings.SCRAPER_RATE_LIMIT_DELAY:
            sleep_time = settings.SCRAPER_RATE_LIMIT_DELAY - elapsed
            logger.debug(f"Rate limiting {domain}: sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)

        _domain_last_request[domain] = time.time()


# Global instance
_scraper = None


def get_scraper() -> ContentScraper:
    """Get or create ContentScraper singleton"""
    global _scraper
    if _scraper is None:
        _scraper = ContentScraper()
    return _scraper
