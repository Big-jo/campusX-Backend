"""Gemini prompts for content enrichment"""


ENRICHMENT_PROMPT_TEMPLATE = """You are a content curator for a social media platform. Transform the following article into engaging, social-media-ready content.

# Article Information
**Title:** {title}
**URL:** {url}

**Content:**
{content}

# Task
Generate enriched content in the following Markdown format:

## Summary
[Write a readable, medium-length summary (2-3 paragraphs) that captures the main points and keeps readers engaged]

## Social Caption
[Write a short, punchy caption (2-3 sentences max) optimized for social media sharing. Make it attention-grabbing and shareable]

## Key Insights
- [First key insight or takeaway]
- [Second key insight or takeaway]
- [Third key insight or takeaway]

## Context
[Explain why this matters - provide context about the significance, implications, or relevance of this content (1-2 paragraphs)]

## Conversation Starter
[Write an engaging question or prompt that would spark discussion in the comments]

## Hashtags
#tag1 #tag2 #tag3 #tag4 #tag5

# Guidelines
- Keep tone conversational and engaging
- Focus on what makes this content shareable
- Highlight the "so what?" - why should readers care?
- Make insights actionable or thought-provoking
- Ensure hashtags are relevant and discoverable
- Use proper Markdown formatting
- Keep the social caption under 280 characters if possible

Generate the enriched content now:
"""


CATEGORY_REFINEMENT_PROMPT = """Given this article content, refine or suggest a more specific interest category.

# Current Category
{current_category}

# Article
**Title:** {title}
**Content Preview:** {content_preview}

# Task
Suggest:
1. A more specific sub-category if applicable
2. Related categories this could fit into
3. Emerging topics or themes detected

Return as JSON:
{{
  "refined_category": "specific category name",
  "sub_categories": ["sub1", "sub2"],
  "related_categories": ["related1", "related2"],
  "emerging_themes": ["theme1", "theme2"]
}}
"""


RSS_DISCOVERY_QUERY_PROMPT = """Generate optimized Google search queries to discover high-quality RSS feeds for the following interest category.

# Interest Category
{interest_category}

# User Interest Context
{interest_context}

# Task
Generate 3-5 highly specific search queries that will find:
1. Authoritative RSS feeds in this domain
2. Niche blogs and publications
3. Industry-specific news sources

Each query should be optimized for Serper API (Google search).

# Guidelines
- Use specific domain keywords
- Include "RSS" or "feed" in queries
- Target authoritative sources
- Avoid social media platforms
- Focus on Nigerian/African content when relevant

Return as JSON array:
[
  "query 1",
  "query 2",
  "query 3"
]
"""


CONTENT_QUALITY_ASSESSMENT_PROMPT = """Assess the quality and suitability of this content for a social media platform.

# Content
**Title:** {title}
**Content:** {content}

# Task
Evaluate:
1. Relevance to stated category
2. Content quality (accuracy, depth, writing)
3. Engagement potential (shareability, discussion value)
4. Suitability for platform (appropriate, safe)

Return as JSON:
{{
  "quality_score": 0.0-1.0,
  "relevance_score": 0.0-1.0,
  "engagement_score": 0.0-1.0,
  "suitability": "suitable|unsuitable",
  "reasoning": "brief explanation",
  "concerns": ["concern1", "concern2"] or []
}}
"""
