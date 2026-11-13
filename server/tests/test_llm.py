"""LLM response parsing and prompt construction."""
import pytest

from api.services import llm
from tests.conftest import FakeLLM


@pytest.mark.parametrize("content, expected", [
    ('{"movies": [{"title": "Amélie", "year": 2001}]}',
     [{"title": "Amélie", "year": 2001}]),
    ('["Up", "Heat"]', [{"title": "Up", "year": None},
                        {"title": "Heat", "year": None}]),
    ('Sure! ```json\n{"movies": [{"title": "Alien", "year": "1979"}]}\n```',
     [{"title": "Alien", "year": 1979}]),
    ('Here you go: ["Up"] enjoy', [{"title": "Up", "year": None}]),
    ('{"suggestions": [{"title": "Big", "year": "n/a"}]}',
     [{"title": "Big", "year": None}]),
])
def test_parse_titles_accepts_common_shapes(content, expected):
    assert llm.parse_titles(content) == expected


@pytest.mark.parametrize("content", [
    "", None, "no json here", "{broken", '{"movies": "nope"}',
    '[1, 2, {"title": ""}, {"name": "x"}]',
])
def test_parse_titles_rejects_garbage(content):
    assert llm.parse_titles(content) == []


def test_parse_titles_never_executes_code(tmp_path):
    marker = tmp_path / "pwned"
    payload = f"__import__('pathlib').Path({str(marker)!r}).touch()"
    assert llm.parse_titles(payload) == []
    assert not marker.exists()


def test_parse_titles_caps_results():
    content = "[" + ",".join(f'"Film {i}"' for i in range(50)) + "]"
    assert len(llm.parse_titles(content)) == llm.MAX_TITLES


def test_build_user_prompt_includes_inputs():
    prompt = llm.build_user_prompt(["Calm", "Curious"], "light rain, 9°C")
    assert "Calm, Curious" in prompt
    assert "light rain, 9°C" in prompt


def test_suggest_titles_requires_key():
    with pytest.raises(llm.LLMError):
        llm.suggest_titles(["Calm"], "", "", "model")


def test_suggest_titles_caches_and_uses_json_mode(fake_llm):
    fake_llm.content = '{"movies": [{"title": "Paddington", "year": 2014}]}'
    first = llm.suggest_titles(["Calm"], "sunny", "key", "model")
    second = llm.suggest_titles(["Calm"], "sunny", "key", "model")
    assert first == second == [{"title": "Paddington", "year": 2014}]
    assert len(fake_llm.calls) == 1
    assert fake_llm.calls[0]["response_format"] == {"type": "json_object"}
    assert fake_llm.calls[0]["messages"][0]["role"] == "system"


def test_circuit_breaker_skips_llm_after_failure(monkeypatch):
    fake = FakeLLM(error=RuntimeError("boom"))
    monkeypatch.setattr(llm, "_get_client", lambda *a, **k: fake)
    with pytest.raises(llm.LLMError):
        llm.suggest_titles(["Sad"], "", "key", "model")
    with pytest.raises(llm.LLMError, match="temporarily disabled"):
        llm.suggest_titles(["Happy"], "", "key", "model")
    assert len(fake.calls) == 1
