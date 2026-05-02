# Deprecated: migrated to DeepSeek. This file now re-exports from the new module.
from src.search.llm_searcher import (
    LLMSearcher as GeminiSearcher,
    get_llm_searcher as get_searcher,
    get_llm_searcher,
    extract_domain,
    is_blocked_domain,
    BLOCKED_DOMAINS,
)

__all__ = ["GeminiSearcher", "get_searcher", "get_llm_searcher", "BLOCKED_DOMAINS"]
