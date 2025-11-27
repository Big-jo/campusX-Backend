"""
Content enrichment using Gemini LLM.
Transforms raw articles into social-media-ready content.
"""

import logging
import re
from typing import Dict, Optional
import google.generativeai as genai
from src.config import settings
from src.enrichment.prompts import (
    ENRICHMENT_PROMPT_TEMPLATE,
    CATEGORY_REFINEMENT_PROMPT,
    CONTENT_QUALITY_ASSESSMENT_PROMPT,
)

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


class ContentEnricher:
    """
    Enriches content using Gemini LLM.
    Generates summaries, captions, insights, and more.
    """

    def __init__(self, model_name: str = "gemini-2.0-flash-exp"):
        self.model = genai.GenerativeModel(model_name)
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

            # Call Gemini
            response = self.model.generate_content(
                prompt, generation_config=self.generation_config
            )

            # Parse markdown response
            enrichment = self._parse_enrichment_response(response.text)

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

            response = self.model.generate_content(
                prompt, generation_config={**self.generation_config, "temperature": 0.3}
            )

            # Parse JSON response
            import json
            assessment = json.loads(response.text)

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

            response = self.model.generate_content(
                prompt, generation_config={**self.generation_config, "temperature": 0.5}
            )

            # Parse JSON response
            import json
            refinement = json.loads(response.text)

            return refinement

        except Exception as e:
            logger.error(f"Category refinement failed: {e}")
            return None


# Singleton
_enricher = None


def get_enricher(model_name: str = "gemini-2.0-flash-exp") -> ContentEnricher:
    """Get or create enricher singleton"""
    global _enricher
    if _enricher is None:
        _enricher = ContentEnricher(model_name)
    return _enricher
