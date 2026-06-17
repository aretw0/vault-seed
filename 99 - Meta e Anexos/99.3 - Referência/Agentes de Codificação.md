---
title: Agentes de Codificação
aliases:
  - Coding Agents
  - Ferramentas de IA para Codificação
tags:
  - meta/ia
  - meta/agentes
status: published
created: 2026-06-15
updated: 2026-06-15
category: referencia
audience: tecnico
related:
  - "[[Usando com Agentes de IA]]"
  - "[[Conhecendo o Agents Lab]]"
  - "[[Integração com Agentes de IA]]"
---

# Agentes de Codificação

Agentes de codificação são ferramentas de IA que operam no terminal, leem e escrevem arquivos, executam comandos e interagem com repositórios Git. Diferem de chatbots por terem acesso direto ao sistema de arquivos e capacidade de tomar ações — não apenas conversar.

## Pi (pi.dev)

**Pi** é um terminal coding harness criado pela Earendil Inc. Sua proposta é ser minimal e extensível: o núcleo fornece primitivos (sessão, contexto, ferramentas), e o usuário constrói as capacidades via skills TypeScript, extensões e templates de prompt.

- **Instalação:** consulte [pi.dev](https://pi.dev) para instruções atualizadas
- **Provedores:** múltiplos incluindo Anthropic (Claude), OpenAI, Google e outros — configurável por sessão
- **Modos de operação:** UI interativa no terminal, saída JSON para scripts, RPC para integrações externas, SDK para embutir em aplicações
- **Licença:** MIT (open source)
- **Referência:** [pi.dev](https://pi.dev) — [[Conhecendo o Agents Lab]] documenta o uso prático

O repositório `agents-lab` cura o ecossistema do Pi: skills, extensões e padrões de uso documentados com exemplos reais.

> Não confundir com pi.ai (Inflection AI) — assistente conversacional sem relação com este projeto.

## Claude Code

**Claude Code** é o CLI oficial da Anthropic para Claude. Opera no terminal, edita arquivos, executa comandos, lê diffs e commita — tudo em loop com o desenvolvedor.

- **Instalação:** `npm install -g @anthropic-ai/claude-code`
- **Provedor:** Anthropic (Claude Sonnet / Opus / Haiku)
- **Diferencial:** integração nativa com o contexto do repositório via `CLAUDE.md`; capacidade de usar MCP servers como extensões
- **Referência:** [claude.ai/code](https://claude.ai/code)

## Gemini CLI

**Gemini CLI** é o CLI da Google para Gemini. Operação similar ao Claude Code com foco em modelos Google.

- **Instalação:** `npm install -g @google/gemini-cli`
- **Provedor:** Google (Gemini 2.5 Flash/Pro)
- **Diferencial:** cota gratuita generosa para uso pessoal; contexto de janela grande (1M tokens)
- **Referência:** github.com/google-gemini/gemini-cli

## OpenCode / Codex CLI

Alternativas open source que seguem o mesmo padrão de agente de terminal:

- **OpenCode** — interface TUI com suporte a múltiplos provedores, escrito em Go
- **Codex CLI** — CLI da OpenAI, deprecado em favor de ferramentas mais recentes

## Como escolher

| Critério | Pi | Claude Code | Gemini CLI |
|---|---|---|---|
| Customização profunda | ✓ (skills TypeScript) | MCP servers | limitada |
| Multi-provider | ✓ (múltiplos) | Anthropic | Google |
| Extensível pela comunidade | ✓ (packages npm) | MCP (crescente) | — |
| Custo | conforme provider | Anthropic API | gratuito até cota |

No vault-seed, qualquer um desses agentes funciona via `AGENTS.md`, `CLAUDE.md` e `GEMINI.md` — os arquivos de contexto que descrevem o projeto sem precisar de explicação manual a cada sessão.
