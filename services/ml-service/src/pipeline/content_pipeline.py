"""
Main content pipeline orchestrator.
Coordinates discovery → scrape → enrich → store flow.
"""

import logging
from typing import List, Dict, Optional
from datetime import datetime
from src.pipeline.pipeline_config import (
    PipelineConfig,
    PipelineStage,
    PipelineStatus,
    DEFAULT_CONFIG,
)
from src.search.content_source import get_content_source, SourceType
from src.scraper.scraper import get_scraper
from src.scraper.processor import get_processor
from src.enrichment.enricher import get_enricher
from src.content.normalizer import get_normalizer
from src.content.deduplicator import get_deduplicator
from src.content.quality_scorer import get_quality_scorer

logger = logging.getLogger(__name__)


class ContentPipeline:
    """
    Content pipeline orchestrator.
    Manages the full lifecycle: discovery → scrape → enrich → store
    """

    def __init__(self, config: PipelineConfig = None):
        self.config = config or DEFAULT_CONFIG
        self.scraper = get_scraper()
        self.processor = get_processor()
        self.enricher = get_enricher() if self.config.enable_enrichment else None
        self.normalizer = get_normalizer()
        self.deduplicator = get_deduplicator() if self.config.enable_deduplication else None
        self.quality_scorer = get_quality_scorer()

    async def run(
        self,
        interest_category: str,
        keywords: List[str] = None,
        source_type: SourceType = SourceType.RSS,
        limit: int = 10,
    ) -> List[Dict]:
        """
        Run full pipeline for a given interest category.

        Args:
            interest_category: Interest category name
            keywords: Optional keywords to filter
            source_type: Content source (RSS, SERPER, GEMINI)
            limit: Max number of articles to process

        Returns:
            List of enriched content dicts ready for MongoDB
        """
        logger.info(
            f"Pipeline started: category={interest_category}, source={source_type}, limit={limit}"
        )

        try:
            # Stage 1: Discovery
            urls = await self._discover(interest_category, keywords, source_type, limit)
            if not urls:
                logger.warning(f"No URLs discovered for {interest_category}")
                return []

            # Stage 2: Scrape & Process
            processed = await self._scrape_and_process(urls)
            if not processed:
                logger.warning("No content successfully scraped")
                return []

            # Stage 2.5: Normalize & Deduplicate
            normalized = self._normalize_and_deduplicate(processed)
            if not normalized:
                logger.warning("All content filtered as duplicates")
                return []

            # Stage 3: Enrich (optional)
            enriched = await self._enrich(normalized) if self.enricher else normalized

            # Stage 4: Enhanced quality scoring
            scored = self._apply_quality_scoring(enriched)

            # Stage 5: Filter by quality gates
            filtered = self._filter_quality(scored)

            logger.info(
                f"Pipeline complete: {len(filtered)}/{len(urls)} articles passed quality gates"
            )
            return filtered

        except Exception as e:
            logger.error(f"Pipeline failed: {e}", exc_info=True)
            return []

    async def _discover(
        self,
        interest_category: str,
        keywords: List[str],
        source_type: SourceType,
        limit: int,
    ) -> List[Dict[str, str]]:
        """
        Stage 1: Discover content URLs

        Returns:
            List of dicts with 'url' and 'title' keys
        """
        logger.info(f"Discovery stage: {source_type}")

        try:
            source = get_content_source(source_type)
            urls = source.search(
                interest_category=interest_category,
                keywords=keywords or [],
                limit=limit,
            )

            logger.info(f"Discovered {len(urls)} URLs")
            return urls

        except Exception as e:
            logger.error(f"Discovery failed: {e}", exc_info=True)
            return []

    async def _scrape_and_process(
        self, urls: List[Dict[str, str]]
    ) -> List[Dict]:
        """
        Stage 2: Scrape and process content

        Args:
            urls: List of dicts with 'url' and 'title'

        Returns:
            List of processed content dicts
        """
        logger.info(f"Scrape stage: {len(urls)} URLs")

        processed = []
        for item in urls:
            url = item["url"]

            try:
                # Scrape
                scraped = self.scraper.scrape(url)
                if not scraped or not scraped.get("content_html"):
                    logger.warning(f"Scrape failed or empty: {url}")
                    continue

                # Process (HTML → Markdown, keywords, quality)
                result = self.processor.process(scraped)
                if not result:
                    logger.warning(f"Processing failed: {url}")
                    continue

                # Add discovery metadata
                result["discoveredTitle"] = item.get("title", "")
                result["scrapedAt"] = datetime.utcnow()
                result["status"] = PipelineStatus.PROCESSING.value

                processed.append(result)

            except Exception as e:
                logger.error(f"Scrape/process failed for {url}: {e}")
                continue

        logger.info(f"Scraped {len(processed)}/{len(urls)} successfully")
        return processed

    async def _enrich(self, processed: List[Dict]) -> List[Dict]:
        """
        Stage 3: Enrich with LLM

        Args:
            processed: List of processed content dicts

        Returns:
            List of enriched content dicts
        """
        logger.info(f"Enrichment stage: {len(processed)} articles")

        enriched = []
        for content in processed:
            try:
                # Enrich with LLM
                enrichment = await self.enricher.enrich(
                    title=content["title"],
                    content=content["content"],
                    url=content["url"],
                )

                # Merge enrichment into content
                content["enriched"] = enrichment
                content["status"] = PipelineStatus.ENRICHED.value

                enriched.append(content)

            except Exception as e:
                logger.error(f"Enrichment failed for {content['url']}: {e}")
                # Still include non-enriched content
                content["enriched"] = None
                enriched.append(content)

        logger.info(f"Enriched {len(enriched)} articles")
        return enriched

    def _normalize_and_deduplicate(self, processed: List[Dict]) -> List[Dict]:
        """
        Stage 2.5: Normalize URLs and detect duplicates

        Args:
            processed: List of processed content dicts

        Returns:
            List of normalized, non-duplicate content
        """
        logger.info(f"Normalization & deduplication stage: {len(processed)} articles")

        normalized = []
        duplicates_found = 0

        for content in processed:
            try:
                # Normalize
                content = self.normalizer.normalize_content(content)

                # Generate fingerprint
                if self.deduplicator:
                    fingerprint = self.deduplicator.generate_fingerprint(
                        content.get("content", ""),
                        content.get("title", "")
                    )
                    content["dedup"] = {"fingerprint": fingerprint}

                    # Check for duplicates
                    duplicates = self.deduplicator.find_duplicates(
                        url=content["url"],
                        title=content["title"],
                        content=content.get("content", ""),
                        fingerprint=fingerprint
                    )

                    if duplicates:
                        logger.info(
                            f"Duplicate detected: {content['title'][:50]}... "
                            f"(strategy: {duplicates[0]['strategy']})"
                        )
                        duplicates_found += 1
                        continue  # Skip duplicate

                normalized.append(content)

            except Exception as e:
                logger.error(f"Normalization failed for {content.get('url')}: {e}")
                # Still include if normalization fails
                normalized.append(content)

        logger.info(
            f"Normalization complete: {len(normalized)} unique, {duplicates_found} duplicates"
        )
        return normalized

    def _apply_quality_scoring(self, content_list: List[Dict]) -> List[Dict]:
        """
        Stage 4: Apply enhanced quality scoring

        Args:
            content_list: List of content dicts

        Returns:
            List of content with updated quality scores
        """
        logger.info(f"Quality scoring stage: {len(content_list)} articles")

        for content in content_list:
            try:
                # Calculate enhanced quality score
                quality_score = self.quality_scorer.calculate_quality_score(content)
                content["qualityScore"] = quality_score

                # Get detailed metrics (for debugging/analysis)
                if logger.isEnabledFor(logging.DEBUG):
                    metrics = self.quality_scorer.get_quality_metrics(content)
                    logger.debug(
                        f"Quality metrics for {content['title'][:30]}...: {metrics}"
                    )

            except Exception as e:
                logger.error(f"Quality scoring failed for {content.get('url')}: {e}")
                # Keep existing score
                pass

        logger.info("Quality scoring complete")
        return content_list

    def _filter_quality(self, content_list: List[Dict]) -> List[Dict]:
        """
        Stage 4: Filter by quality gates

        Args:
            content_list: List of content dicts

        Returns:
            List of content that passed quality gates
        """
        logger.info("Quality filter stage")

        filtered = []
        for content in content_list:
            # Check quality score
            if content.get("qualityScore", 0) < self.config.min_quality_score:
                logger.debug(
                    f"Rejected (low quality): {content['url']} "
                    f"(score={content.get('qualityScore')})"
                )
                continue

            # Check word count
            word_count = content.get("metadata", {}).get("wordCount", 0)
            if word_count < self.config.min_word_count:
                logger.debug(
                    f"Rejected (too short): {content['url']} ({word_count} words)"
                )
                continue

            if word_count > self.config.max_word_count:
                logger.debug(
                    f"Rejected (too long): {content['url']} ({word_count} words)"
                )
                continue

            # Passed all gates
            filtered.append(content)

        logger.info(f"Quality filter: {len(filtered)}/{len(content_list)} passed")
        return filtered


# Singleton
_pipeline = None


def get_pipeline(config: PipelineConfig = None) -> ContentPipeline:
    """Get or create pipeline singleton"""
    global _pipeline
    if _pipeline is None:
        _pipeline = ContentPipeline(config)
    return _pipeline
