"""
Unified DeepSeek LLM client for all AI-powered modules.
Uses the OpenAI-compatible DeepSeek API.
"""
import logging
from openai import OpenAI
from src.config import settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com",
        )
    return _client


def generate(
    prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    top_p: float = 1.0,
) -> str:
    """
    Call DeepSeek and return the response text.
    Raises on API errors — callers handle fallback logic.
    """
    client = _get_client()
    response = client.chat.completions.create(
        model=settings.DEEPSEEK_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
        top_p=top_p,
    )
    return response.choices[0].message.content.strip()
