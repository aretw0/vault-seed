# CI Hardening — Dependabot e Audit Moderado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar Dependabot para atualização automática de dependências e um tier informacional de audit moderado no pipeline de segurança existente.

**Architecture:** Duas mudanças independentes: criar `.github/dependabot.yml` com ecosystems `npm` (root + packages/cli) e `github-actions`; adicionar um passo `continue-on-error: true` no `security-audit.yml` existente para tornar vulns moderadas visíveis sem bloquear o CI.

**Tech Stack:** GitHub Actions, Dependabot, pnpm audit

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `.github/dependabot.yml` | Criado — define atualização automática de deps npm e actions |
| `.github/workflows/security-audit.yml` | Modificado — adiciona tier informacional de audit moderado |

---

### Task 1: Criar configuração do Dependabot

**Files:**
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Criar `.github/dependabot.yml`**

```yaml
version: 2

updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      npm-root:
        patterns:
          - "*"
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "automação"

  - package-ecosystem: "npm"
    directory: "/packages/cli"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      npm-cli:
        patterns:
          - "*"
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "automação"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      github-actions:
        patterns:
          - "*"
    commit-message:
      prefix: "chore(deps)"
    labels:
      - "dependencies"
      - "automação"
```

- [ ] **Step 2: Verificar que o arquivo tem os 3 blocos esperados**

```bash
grep "package-ecosystem" .github/dependabot.yml
```

Expected:
```
  - package-ecosystem: "npm"
  - package-ecosystem: "npm"
  - package-ecosystem: "github-actions"
```

- [ ] **Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot for npm and GitHub Actions updates"
```

---

### Task 2: Adicionar tier moderado ao security-audit.yml

**Files:**
- Modify: `.github/workflows/security-audit.yml`

- [ ] **Step 1: Adicionar passo de audit moderado após o `Security gate` existente**

O arquivo completo após a mudança:

```yaml
name: Security Audit

on:
  pull_request:
    branches: [main, develop]
    paths:
      - "package.json"
      - "pnpm-lock.yaml"
      - ".github/workflows/security-audit.yml"
      - ".github/actions/setup/action.yml"
  workflow_dispatch:
  schedule:
    - cron: "0 9 * * 1"

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  audit:
    name: Audit production dependencies
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

      - name: Setup
        uses: ./.github/actions/setup

      - name: Security gate (high/critical, prod)
        run: pnpm audit --audit-level=high --prod

      - name: Audit moderado — prod (informacional)
        if: always()
        run: pnpm audit --audit-level=moderate --prod
        continue-on-error: true

      - name: Full audit report
        if: always()
        run: pnpm audit --json > audit-full.json || true

      - name: Upload audit report
        if: always()
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: pnpm-audit-full-report
          path: audit-full.json
          retention-days: 30
```

Diferenças em relação ao original:
- Nome do passo `Security gate` renomeado para `Security gate (high/critical, prod)` — deixa claro o que bloqueia
- Novo passo `Audit moderado — prod (informacional)` com `if: always()` e `continue-on-error: true`

- [ ] **Step 2: Verificar que o YAML é válido**

```bash
cat .github/workflows/security-audit.yml
```

Expected: arquivo com 5 steps: Checkout, Setup, Security gate, Audit moderado, Full audit report, Upload.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/security-audit.yml
git commit -m "ci: add informational moderate audit tier to security workflow"
```
