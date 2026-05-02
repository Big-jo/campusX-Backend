"""
Content enrichment using Gemini LLM.
Transforms raw articles into social-media-ready content.
"""

import logging
import re
from typing import Dict, Optional
from src.llm.deepseek_client import generate as llm_generate
from src.enrichment.prompts import (
    ENRICHMENT_PROMPT_TEMPLATE,
    CATEGORY_REFINEMENT_PROMPT,
    CONTENT_QUALITY_ASSESSMENT_PROMPT,
)

logger = logging.getLogger(__name__)


class ContentEnricher:
    """
    Enriches content using DeepSeek LLM.
    Generates summaries, captions, insights, and more.
    """

    def __init__(self):
        self.generation_config = {
            "temperature": 0.7,
            "top_p": 0.9,
            "max_output_tokens": 2048,
        }

    async def enrich(
        self, title: str, content: str, url: str = ""
    ) -> Optional[Dict]:
        """
        Enrich content with LLM-generated summaries, captions, insights.

        Args:
            title: Article title
            content: Article content (markdown)
            url: Article URL

        Returns:
            Dict with enrichment fields in Markdown
        """
        try:
            # Truncate content if too long (keep first 3000 chars)
            content_preview = content[:3000] if len(content) > 3000 else content

            # Generate prompt
            prompt = ENRICHMENT_PROMPT_TEMPLATE.format(
                title=title, url=url, content=content_preview
            )

            response_text = llm_generate(
                prompt,
                temperature=self.generation_config["temperature"],
                max_tokens=self.generation_config["max_output_tokens"],
                top_p=self.generation_config.get("top_p", 1.0),
            )
            enrichment = self._parse_enrichment_response(response_text)

            logger.info(f"Enriched content: {title[:50]}...")
            return enrichment

        except Exception as e:
            logger.error(f"Enrichment failed for '{title}': {e}", exc_info=True)
            return None

    def _parse_enrichment_response(self, response_text: str) -> Dict:
        """
        Parse Gemini's markdown response into structured dict.

        Args:
            response_text: Raw markdown response

        Returns:
            Dict with parsed fields
        """
        enrichment = {
            "summary": "",
            "caption": "",
            "insights": [],
            "context": "",
            "conversation_starter": "",
            "hashtags": [],
        }

        try:
            # Extract sections using regex
            summary = self._extract_section(response_text, r"## Summary\s*\n(.*?)(?=\n##|\Z)", re.DOTALL)
            caption = self._extract_section(response_text, r"## Social Caption\s*\n(.*?)(?=\n##|\Z)", re.DOTALL)
            insights_raw = self._extract_section(response_text, r"## Key Insights\s*\n(.*?)(?=\n##|\Z)", re.DOTALL)
            context = self._extract_section(response_text, r"## Context\s*\n(.*?)(?=\n##|\Z)", re.DOTALL)
            starter = self._extract_section(response_text, r"## Conversation Starter\s*\n(.*?)(?=\n##|\Z)", re.DOTALL)
            hashtags_raw = self._extract_section(response_text, r"## Hashtags\s*\n(.*?)(?=\n##|\Z)", re.DOTALL)

            # Clean and assign
            enrichment["summary"] = summary.strip()
            enrichment["caption"] = caption.strip()
            enrichment["context"] = context.strip()
            enrichment["conversation_starter"] = starter.strip()

            # Parse insights (bullet points)
            if insights_raw:
                insights = re.findall(r"^[\-\*]\s*(.+)$", insights_raw, re.MULTILINE)
                enrichment["insights"] = [i.strip() for i in insights if i.strip()]

            # Parse hashtags
            if hashtags_raw:
                hashtags = re.findall(r"#(\w+)", hashtags_raw)
                enrichment["hashtags"] = hashtags

        except Exception as e:
            logger.warning(f"Failed to parse enrichment response: {e}")

        return enrichment

    def _extract_section(self, text: str, pattern: str, flags: int = 0) -> str:
        """Extract section from markdown using regex"""
        match = re.search(pattern, text, flags)
        return match.group(1) if match else ""

    async def assess_quality(
        self, title: str, content: str
    ) -> Optional[Dict]:
        """
        Assess content quality using LLM.

        Args:
            title: Article title
            content: Article content

        Returns:
            Dict with quality assessment
        """
        try:
            content_preview = content[:2000] if len(content) > 2000 else content

            prompt = CONTENT_QUALITY_ASSESSMENT_PROMPT.format(
                title=title, content=content_preview
            )

            response_text = llm_generate(
                prompt,
                temperature=0.3,
                max_tokens=self.generation_config["max_output_tokens"],
            )

            import json
            assessment = json.loads(response_text)

            return assessment

        except Exception as e:
            logger.error(f"Quality assessment failed: {e}")
            return None

    async def refine_category(
        self, title: str, content: str, current_category: str
    ) -> Optional[Dict]:
        """
        Refine or suggest better category for content.

        Args:
            title: Article title
            content: Article content preview
            current_category: Current category assignment

        Returns:
            Dict with category refinements
        """
        try:
            content_preview = content[:1000] if len(content) > 1000 else content

            prompt = CATEGORY_REFINEMENT_PROMPT.format(
                current_category=current_category,
                title=title,
                content_preview=content_preview,
            )

            response_text = llm_generate(
                prompt,
                temperature=0.5,
                max_tokens=self.generation_config["max_output_tokens"],
            )

            import json
            refinement = json.loads(response_text)

            return refinement

        except Exception as e:
            logger.error(f"Category refinement failed: {e}")
            return None


# Singleton
_enricher = None


def get_enricher() -> ContentEnricher:
    """Get or create enricher singleton"""
    global _enricher
    if _enricher is None:
        _enricher = ContentEnricher()
    return _enricher
