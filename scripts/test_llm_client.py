#!/usr/bin/env python3
"""Unit tests for scripts/llm_client.py.

Execução:
  uv run python scripts/test_llm_client.py
  python scripts/test_llm_client.py
"""
import json
import sys
import os
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(__file__))
from llm_client import call_llm, resolve_provider


class TestResolveProvider(unittest.TestCase):
    def test_none_when_no_keys(self):
        self.assertIsNone(resolve_provider({}))

    def test_anthropic_detected(self):
        self.assertEqual(resolve_provider({"ANTHROPIC_API_KEY": "sk-ant-test"}), "anthropic")

    def test_openai_detected(self):
        self.assertEqual(resolve_provider({"OPENAI_API_KEY": "sk-test"}), "openai")

    def test_groq_detected(self):
        self.assertEqual(resolve_provider({"GROQ_API_KEY": "gsk-test"}), "groq")

    def test_openrouter_detected(self):
        self.assertEqual(resolve_provider({"OPENROUTER_API_KEY": "sk-or-test"}), "openrouter")

    def test_custom_base_url_takes_precedence(self):
        env = {
            "DGK_LLM_BASE_URL": "http://localhost:11434/v1",
            "DGK_LLM_MODEL": "llama3",
            "ANTHROPIC_API_KEY": "sk-ant-test",
        }
        self.assertEqual(resolve_provider(env), "custom")

    def test_anthropic_before_openai(self):
        env = {"ANTHROPIC_API_KEY": "sk-ant", "OPENAI_API_KEY": "sk-oai"}
        self.assertEqual(resolve_provider(env), "anthropic")

    def test_openai_before_groq(self):
        env = {"OPENAI_API_KEY": "sk-oai", "GROQ_API_KEY": "gsk"}
        self.assertEqual(resolve_provider(env), "openai")


class TestCallLlm(unittest.TestCase):
    def _mock_anthropic_response(self, text):
        return json.dumps({
            "content": [{"text": text}]
        }).encode()

    def _mock_openai_response(self, text):
        return json.dumps({
            "choices": [{"message": {"content": text}}]
        }).encode()

    def test_raises_when_no_provider(self):
        with self.assertRaises(RuntimeError) as ctx:
            call_llm("test", env={})
        self.assertIn("nenhum provedor", str(ctx.exception).lower())

    def test_anthropic_called_with_correct_endpoint(self):
        captured = []

        def fake_post(req):
            captured.append(req.full_url)
            return self._mock_anthropic_response("resposta")

        result = call_llm("Olá", env={"ANTHROPIC_API_KEY": "sk-ant-test"}, http_post=fake_post)
        self.assertEqual(result, "resposta")
        self.assertIn("api.anthropic.com", captured[0])

    def test_groq_uses_openai_compatible_endpoint(self):
        captured = []

        def fake_post(req):
            captured.append(req.full_url)
            return self._mock_openai_response("resposta groq")

        result = call_llm("Olá", env={"GROQ_API_KEY": "gsk-test"}, http_post=fake_post)
        self.assertEqual(result, "resposta groq")
        self.assertIn("groq.com", captured[0])

    def test_custom_base_url(self):
        captured = []

        def fake_post(req):
            captured.append(req.full_url)
            return self._mock_openai_response("ollama response")

        env = {
            "DGK_LLM_BASE_URL": "http://localhost:11434/v1",
            "DGK_LLM_MODEL": "llama3",
        }
        result = call_llm("Olá", env=env, http_post=fake_post)
        self.assertEqual(result, "ollama response")
        self.assertIn("localhost:11434", captured[0])

    def test_dgk_llm_model_overrides_default(self):
        captured_bodies = []

        def fake_post(req):
            captured_bodies.append(json.loads(req.data))
            return self._mock_anthropic_response("ok")

        env = {"ANTHROPIC_API_KEY": "sk-ant", "DGK_LLM_MODEL": "claude-opus-4-8"}
        call_llm("test", env=env, http_post=fake_post)
        self.assertEqual(captured_bodies[0]["model"], "claude-opus-4-8")


if __name__ == "__main__":
    unittest.main()
