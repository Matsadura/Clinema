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
    assert len(llm.parse_titles(content)) == \
        llm.MAX_TITLES + llm.EXTRA_CANDIDATES


def test_build_user_prompt_includes_inputs():
    prompt = llm.build_user_prompt(["Calm", "Curious"], "light rain, 9°C")
    assert "Calm, Curious" in prompt
    assert "light rain, 9°C" in prompt


def test_suggest_titles_requires_key():
    with pytest.raises(llm.LLMError):
        llm.suggest_titles(["Calm"], "", "", "model")


def test_suggest_titles_is_not_cached_and_uses_strict_schema(fake_llm):
    """Identical requests must reach the model every time (no stale
    repeats) and ask for the strict structured-output schema."""
    fake_llm.content = '{"movies": [{"title": "Paddington", "year": 2014}]}'
    llm.suggest_titles(["Calm"], "sunny", "key", "model")
    llm.suggest_titles(["Calm"], "sunny", "key", "model")
    assert len(fake_llm.calls) == 2
    fmt = fake_llm.calls[0]["response_format"]
    assert fmt["type"] == "json_schema"
    assert fmt["json_schema"]["strict"] is True
    assert fake_llm.calls[0]["messages"][0]["role"] == "system"
    assert fake_llm.calls[0]["temperature"] == 0.85
    assert fake_llm.calls[0]["presence_penalty"] > 0


def test_circuit_breaker_skips_llm_after_failure(monkeypatch):
    fake = FakeLLM(error=RuntimeError("boom"))
    monkeypatch.setattr(llm, "_get_client", lambda *a, **k: fake)
    with pytest.raises(llm.LLMError):
        llm.suggest_titles(["Sad"], "", "key", "model")
    with pytest.raises(llm.LLMError, match="temporarily disabled"):
        llm.suggest_titles(["Happy"], "", "key", "model")
    assert len(fake.calls) == 1


class ModelNotFound(Exception):
    status_code = 404


def test_parse_models():
    assert llm.parse_models(" a , b,,") == ["a", "b"]
    assert llm.parse_models("") == llm.parse_models(llm.DEFAULT_MODELS)


def test_retired_model_falls_through_to_next(monkeypatch):
    class Client(FakeLLM):
        def _create(self, **kwargs):
            if kwargs["model"] == "retired":
                self.calls.append(kwargs)
                raise ModelNotFound("model_not_found")
            return super()._create(**kwargs)

    fake = Client(content='["Stalker"]')
    monkeypatch.setattr(llm, "_get_client", lambda *a, **k: fake)
    titles = llm.suggest_titles(["Calm"], "", "key", "retired, working")
    assert titles == [{"title": "Stalker", "year": None}]
    assert [c["model"] for c in fake.calls] == ["retired", "working"]

    # The retired model is remembered and not retried
    llm.suggest_titles(["Sad"], "", "key", "retired, working")
    assert [c["model"] for c in fake.calls][-1] == "working"
    assert [c["model"] for c in fake.calls].count("retired") == 1


def test_all_models_unavailable_raises(monkeypatch):
    fake = FakeLLM(error=ModelNotFound("model_not_found"))
    monkeypatch.setattr(llm, "_get_client", lambda *a, **k: fake)
    with pytest.raises(llm.LLMError):
        llm.suggest_titles(["Calm"], "", "key", "a,b")
    assert len(fake.calls) == 2


def test_reasoning_models_get_low_effort(fake_llm):
    fake_llm.content = '["Up"]'
    llm.suggest_titles(["Calm"], "", "key", "openai/gpt-oss-120b")
    assert fake_llm.calls[0]["reasoning_effort"] == "low"
    llm.suggest_titles(["Sad"], "", "key", "qwen/qwen3.8-27b")
    assert "reasoning_effort" not in fake_llm.calls[1]
