#!/usr/bin/env python3
"""Provider-agnostic LLM client. No external dependencies — urllib only.

Provider detection order (first env key wins):
  1. DGK_LLM_BASE_URL + DGK_LLM_MODEL  — custom/local (Ollama, LM Studio, etc.)
  2. ANTHROPIC_API_KEY                  — Anthropic native API
  3. OPENAI_API_KEY                     — OpenAI
  4. GROQ_API_KEY                       — Groq (fast inference)
  5. OPENROUTER_API_KEY                 — OpenRouter (model aggregator)

Override model with DGK_LLM_MODEL regardless of provider.

Usage:
  from llm_client import call_llm, resolve_provider

  provider = resolve_provider()   # or pass env dict for testing
  if provider:
      response = call_llm("Summarize: ...", env=os.environ)
"""

from __future__ import annotations

import json
import os
from typing import Any
from urllib.request import Request, urlopen

_PROVIDERS: dict[str, dict[str, Any]] = {
    "anthropic": {
        "env_key": "ANTHROPIC_API_KEY",
        "default_model": "claude-haiku-4-5-20251001",
    },
    "openai": {
        "env_key": "OPENAI_API_KEY",
        "base_url": "https://api.openai.com/v1",
        "default_model": "gpt-4o-mini",
    },
    "groq": {
        "env_key": "GROQ_API_KEY",
        "base_url": "https://api.groq.com/openai/v1",
        "default_model": "llama-3.1-8b-instant",
    },
    "openrouter": {
        "env_key": "OPENROUTER_API_KEY",
        "base_url": "https://openrouter.ai/api/v1",
        "default_model": "meta-llama/llama-3.1-8b-instruct:free",
    },
}


def resolve_provider(env: dict[str, str] | None = None) -> str | None:
    """Return the name of the first available provider, or None."""
    env = env if env is not None else os.environ
    if env.get("DGK_LLM_BASE_URL"):
        return "custom"
    for name, cfg in _PROVIDERS.items():
        if env.get(cfg["env_key"]):
            return name
    return None


def _effective_model(provider: str, env: dict[str, str]) -> str:
    override = env.get("DGK_LLM_MODEL", "").strip()
    if override:
        return override
    if provider == "custom":
        return env.get("DGK_LLM_MODEL", "default")
    return _PROVIDERS[provider]["default_model"]


def _call_anthropic(prompt: str, model: str, api_key: str, http_post: Any) -> str:
    body = json.dumps({
        "model": model,
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    response = json.loads(http_post(req))
    return response["content"][0]["text"].strip()


def _call_openai_compatible(prompt: str, model: str, api_key: str, base_url: str, http_post: Any) -> str:
    body = json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 1024,
    }).encode()
    req = Request(
        f"{base_url.rstrip('/')}/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "content-type": "application/json",
        },
        method="POST",
    )
    response = json.loads(http_post(req))
    return response["choices"][0]["message"]["content"].strip()


def _default_http_post(req: Request) -> bytes:
    with urlopen(req, timeout=30) as resp:
        return resp.read()


def call_llm(
    prompt: str,
    env: dict[str, str] | None = None,
    http_post: Any = None,
) -> str:
    """Call the first available LLM provider with prompt. Returns response text.

    Raises RuntimeError if no provider is configured.
    Inject http_post for testing: http_post(Request) -> bytes.
    """
    env = env if env is not None else os.environ
    http_post = http_post or _default_http_post

    provider = resolve_provider(env)
    if provider is None:
        raise RuntimeError(
            "Nenhum provedor LLM configurado. "
            "Defina ANTHROPIC_API_KEY, GROQ_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY "
            "ou DGK_LLM_BASE_URL+DGK_LLM_MODEL para um modelo local."
        )

    model = _effective_model(provider, env)

    if provider == "anthropic":
        return _call_anthropic(prompt, model, env["ANTHROPIC_API_KEY"], http_post)

    if provider == "custom":
        base_url = env["DGK_LLM_BASE_URL"]
        api_key = env.get("DGK_LLM_API_KEY", "local")
        return _call_openai_compatible(prompt, model, api_key, base_url, http_post)

    cfg = _PROVIDERS[provider]
    return _call_openai_compatible(prompt, model, env[cfg["env_key"]], cfg["base_url"], http_post)
