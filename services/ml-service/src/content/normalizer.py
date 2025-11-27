"""
Content normalization utilities.
Handles URL canonicalization, HTML cleanup, and metadata extraction.
"""

import logging
import re
from typing import Dict, Optional
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from datetime import datetime
import dateutil.parser

logger = logging.getLogger(__name__)


class ContentNormalizer:
    """
    Normalizes content for consistent storage and deduplication.
    """

    def __init__(self):
        # Tracking parameters to remove from URLs
        self.tracking_params = {
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid',
            '_ga', '_gac', 'ref', 'source', 'share'
        }

    def normalize_url(self, url: str) -> str:
        """
        Canonicalize URL by removing tracking params and normalizing structure.

        Args:
            url: Original URL

        Returns:
            Canonical URL
        """
        try:
            # Parse URL
            parsed = urlparse(url)

            # Normalize scheme (always https if available)
            scheme = 'https' if parsed.scheme in ('http', 'https') else parsed.scheme

            # Normalize hostname (lowercase, remove www)
            hostname = parsed.hostname.lower() if parsed.hostname else ''
            if hostname.startswith('www.'):
                hostname = hostname[4:]

            # Keep port if non-standard
            port = f':{parsed.port}' if parsed.port and parsed.port not in (80, 443) else ''

            # Normalize path (remove trailing slash except root)
            path = parsed.path.rstrip('/') if parsed.path != '/' else '/'

            # Filter query parameters (remove tracking)
            if parsed.query:
                query_params = parse_qs(parsed.query, keep_blank_values=True)
                # Remove tracking parameters
                filtered_params = {
                    k: v for k, v in query_params.items()
                    if k.lower() not in self.tracking_params
                }
                # Sort for consistency
                query = urlencode(sorted(filtered_params.items()), doseq=True) if filtered_params else ''
            else:
                query = ''

            # Reconstruct URL
            canonical = urlunparse((
                scheme,
                f'{hostname}{port}',
                path,
                '',  # params (rarely used)
                query,
                ''   # fragment (remove)
            ))

            if canonical != url:
                logger.debug(f"Normalized URL: {url} → {canonical}")

            return canonical

        except Exception as e:
            logger.warning(f"URL normalization failed for {url}: {e}")
            return url

    def normalize_title(self, title: str) -> str:
        """
        Normalize title for comparison.

        Args:
            title: Original title

        Returns:
            Normalized title
        """
        if not title:
            return ""

        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', title.strip())

        # Remove common suffixes (site names)
        patterns = [
            r'\s*[\-|–]\s*.+$',  # " - Site Name" or " | Site Name"
            r'\s*\[.+\]$',       # " [Category]"
            r'\s*\(.+\)$',       # " (Source)"
        ]

        for pattern in patterns:
            normalized = re.sub(pattern, '', normalized, count=1)

        return normalized.strip()

    def extract_domain(self, url: str) -> str:
        """
        Extract clean domain from URL.

        Args:
            url: URL

        Returns:
            Domain (e.g., "example.com")
        """
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname.lower() if parsed.hostname else ''
            if hostname.startswith('www.'):
                hostname = hostname[4:]
            return hostname
        except:
            return ""

    def parse_date(self, date_string: str) -> Optional[datetime]:
        """
        Parse date string into datetime.

        Args:
            date_string: Date string in various formats

        Returns:
            datetime object or None
        """
        if not date_string:
            return None

        try:
            # Use dateutil for flexible parsing
            return dateutil.parser.parse(date_string)
        except Exception as e:
            logger.debug(f"Date parsing failed for '{date_string}': {e}")
            return None

    def normalize_content(self, content: Dict) -> Dict:
        """
        Normalize content document.

        Args:
            content: Content dict with url, title, etc.

        Returns:
            Normalized content dict
        """
        normalized = content.copy()

        # Normalize URL
        if 'url' in normalized:
            normalized['url'] = self.normalize_url(normalized['url'])
            normalized['sourceDomain'] = self.extract_domain(normalized['url'])

        # Normalize title
        if 'title' in normalized:
            normalized['title_normalized'] = self.normalize_title(normalized['title'])

        # Parse dates
        if 'metadata' in normalized:
            metadata = normalized['metadata']
            if 'publishedAt' in metadata and isinstance(metadata['publishedAt'], str):
                parsed_date = self.parse_date(metadata['publishedAt'])
                if parsed_date:
                    metadata['publishedAt'] = parsed_date

        # Add normalization timestamp
        normalized['normalizedAt'] = datetime.utcnow()

        return normalized


# Singleton
_normalizer = None


def get_normalizer() -> ContentNormalizer:
    """Get or create normalizer singleton"""
    global _normalizer
    if _normalizer is None:
        _normalizer = ContentNormalizer()
    return _normalizer
