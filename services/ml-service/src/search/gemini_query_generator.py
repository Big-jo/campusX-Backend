# Deprecated: migrated to DeepSeek. This file now re-exports from the new module.
from src.search.query_generator import (
    QueryGenerator as GeminiQueryGenerator,
    get_query_generator as get_gemini_query_generator,
    get_query_generator,
)

__all__ = ["GeminiQueryGenerator", "get_gemini_query_generator", "get_query_generator"]
