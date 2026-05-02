"""
Unit tests for DeepSeek LLM client.
All tests mock the OpenAI client — no real API calls.
"""
import pytest
from unittest.mock import MagicMock, patch
import src.llm.deepseek_client as deepseek_module
from src.llm.deepseek_client import generate


def _make_mock_response(content: str):
    """Build a fake OpenAI chat completion response."""
    msg = MagicMock()
    msg.content = content
    choice = MagicMock()
    choice.message = msg
    resp = MagicMock()
    resp.choices = [choice]
    return resp


@pytest.fixture(autouse=True)
def reset_client():
    """Reset module-level singleton before each test."""
    deepseek_module._client = None
    yield
    deepseek_module._client = None


def test_generate_returns_stripped_response():
    with patch("src.llm.deepseek_client.OpenAI") as MockOpenAI:
        mock_client = MockOpenAI.return_value
        mock_client.chat.completions.create.return_value = _make_mock_response("  hello world  ")

        result = generate("say hello")
        assert result == "hello world"


def test_generate_forwards_temperature_and_max_tokens():
    with patch("src.llm.deepseek_client.OpenAI") as MockOpenAI:
        mock_client = MockOpenAI.return_value
        mock_client.chat.completions.create.return_value = _make_mock_response("ok")

        generate("test", temperature=0.3, max_tokens=50)

        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["temperature"] == 0.3
        assert call_kwargs["max_tokens"] == 50


def test_generate_uses_configured_model(monkeypatch):
    with patch("src.llm.deepseek_client.OpenAI") as MockOpenAI:
        mock_client = MockOpenAI.return_value
        mock_client.chat.completions.create.return_value = _make_mock_response("ok")

        monkeypatch.setattr("src.llm.deepseek_client.settings.DEEPSEEK_MODEL", "deepseek-reasoner")
        generate("test")

        call_kwargs = mock_client.chat.completions.create.call_args.kwargs
        assert call_kwargs["model"] == "deepseek-reasoner"


def test_generate_propagates_api_error():
    import openai
    with patch("src.llm.deepseek_client.OpenAI") as MockOpenAI:
        mock_client = MockOpenAI.return_value
        mock_client.chat.completions.create.side_effect = openai.APIError(
            message="rate limit", request=MagicMock(), body=None
        )

        with pytest.raises(openai.APIError):
            generate("test")


def test_generate_reuses_singleton():
    """Client should be instantiated only once across multiple calls."""
    with patch("src.llm.deepseek_client.OpenAI") as MockOpenAI:
        mock_client = MockOpenAI.return_value
        mock_client.chat.completions.create.return_value = _make_mock_response("a")

        generate("first")
        generate("second")

        assert MockOpenAI.call_count == 1
