# CI Hardening — Dependabot e Audit Moderado

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar Dependabot para atualização automática de dependências e um tier informacional de audit moderado no pipeline de segurança existente.

**Architecture:** Duas mudanças independentes e pequenas: (1) `.github/dependabot.yml` novo com ecosystems `npm` e `github-actions`; (2) passo adicional `continue-on-error: true` no `security-audit.yml` existente. Nenhuma ação customizada necessária.

**Tech Stack:** GitHub Actions, Dependabot, pnpm audit

---

## Estado atual

O vault-seed já possui boas práticas de CI:
- Actions hash-pinned em todos os workflows
- `pnpm install --frozen-lockfile` via `.github/actions/setup`
- `permissions: contents: read` (mínimo necessário)
- `pnpm audit --audit-level=high --prod` — gate bloqueante para high/critical
- Upload de relatório completo como artefato

**O que falta:**
- Dependabot — nenhum `.github/dependabot.yml` existe
- Tier 2 moderado — vulnerabilidades moderadas em prod não são visíveis no CI

---

## Entrega 1: Dependabot

**Arquivo:** `.github/dependabot.yml`

Dois ecosystems:

### `npm` (gerencia pnpm via ecosystem npm)

- Diretório: `/` (root — cobre `package.json` e `pnpm-lock.yaml`)
- Diretório: `/packages/cli` (cobre `@dgk/cli`)
- Frequência: semanal (segunda-feira)
- PRs agrupados via `groups:` — todas as deps de um ecosystem num único PR por ciclo
- Prefixo: `chore(deps):` — segue Conventional Commits do projeto
- Labels: `dependencies`, `automação`

### `github-actions`

- Diretório: `/` (varre todos os `uses:` em `.github/`)
- Frequência: semanal (segunda-feira)
- Prefixo: `chore(deps):` 
- Labels: `dependencies`, `automação`

**Nota sobre o usuário:** `dependabot.yml` **não está** na lista `files_to_remove` do `initialize.yml`. O usuário herda a configuração — correto, pois o vault do usuário também se beneficia de deps atualizadas.

---

## Entrega 2: Audit tier moderado

**Arquivo:** `.github/workflows/security-audit.yml`

Adicionar um passo após o `Security gate` existente:

```yaml
- name: Audit moderado — prod (informacional)
  if: always()
  run: pnpm audit --audit-level=moderate --prod
  continue-on-error: true
```

Comportamento:
- `if: always()` — roda mesmo que o gate bloqueante passe ou falhe
- `continue-on-error: true` — nunca bloqueia o CI
- Resultado visível no log do workflow como aviso amarelo quando há vulns moderadas
- Sem criação automática de issues — visibilidade simples, sem ruído

---

## O que não está no escopo

- Sistema de issues automáticas para CVEs (depende de composite actions customizadas — complexidade desnecessária)
- Renovate como alternativa ao Dependabot (Dependabot é nativo do GitHub, zero custo de setup)
- Audit de devDependencies — risco real está em prod deps
