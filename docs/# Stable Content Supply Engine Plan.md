# Stable Content Supply Engine Plan

## Overview
Upgrade the existing RSS-based ingestion into a multi-layered, stable content engine that continuously supplies high-quality, enriched, and personalized content.  
MongoDB remains the primary datastore for content, metadata, and user interest graphs.

---

## System Layers

### 1. **Seed Content Layer (RSS)**
- Continue using RSS feeds as baseline low-quality/seed input.
- Many current links fail → use **Serper (Google search API)** to automatically discover new RSS feeds for existing interest categories.
- Store new RSS links in MongoDB as a growing “quality RSS tree.”
<!-- - Periodically run RSS discovery jobs to expand coverage. --> SHELVE FOR NOW

### 2. **HTML Scraping Layer**
- Use HTML extractors (Scrapy, Playwright) on:
  - Non-RSS sites
  - Category/trending pages
  - Article pages
- Normalize extracted content into a consistent structure before enrichment.

---

## 3. **LLM Enrichment Layer**
Use Gemini to transform raw articles into **social-network-ready content**.

### Enrichment Outputs (Markdown)
- **Readable summary** (medium length)
- **Social-friendly caption** (short, punchy)
- **Key insights / bullets**
- **Context expansion** (why it matters)
- **Conversation starter** or **question prompt**
- **Hashtags or tags** (optional)
- **Formated in Markdown** for easy rendering


All enrichment generated in Markdown for consistency.

---

## 4. **Interest Graph & Topic Expansion**
As users interact with posts:
- Extract semantic embeddings.
- Update user’s interest vectors.
- Track transitions (e.g., Tech → Gaming → Game Design).
- Dynamically expand category taxonomy using LLM + clustering or embeddings analysis using features we already have or more advanced methods.
- Feed new interest topics back into:
  - RSS discovery via Serper
  - Search-query generation
  - Scraping targets

The system becomes a feedback loop that discovers more content as user interests grow.

---

## 5. **Search Query Generator (Gemini → Serper)**
- Gemini generates optimized Google queries for Serper.
- Goal: smallest number of API calls → maximum relevant RSS URLs.
- Queries tailored to interest clusters stored in MongoDB.
- Batch queries strategically to reduce cost.

---

## 6. **Storage (MongoDB)**
Collections:

Indexes:
- Full-text search  
- Tag/category indexes for fast retrieval  
---

## 7. **Content Flow Summary**
1. Discover RSS links (Serper + Gemini)
2. Fetch + store RSS sources
3. Scrape HTML pages for deeper content
4. Enrich using Gemini → Markdown output
5. Store enriched content in MongoDB
6. Track user interactions → update interest graph
7. Use interests to fetch *more* content automatically

---

## Goal
A self-improving, automated content ecosystem that:
- finds high-quality content,
- enriches it,
- personalizes it,
- and grows with each user interaction.
