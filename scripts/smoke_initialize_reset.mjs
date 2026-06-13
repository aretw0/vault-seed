/**
 * Simulates the initialize.yml "Reset notas de referência" step in memory.
 *
 * Verifies that for every note in NOTE_STATUS_CONTRACT.publishedResetOnInit:
 *   1. The file exists in the vault source
 *   2. The current status is "published" (as expected on vault-seed's site)
 *   3. The sed replacement `s/^status: published$/status: draft/` would correctly
 *      produce `status: draft` — i.e. the bash step would work if run
 *
 * No files are modified. Run with: node scripts/smoke_initialize_reset.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));

// Must stay in sync with smoke_template.js NOTE_STATUS_CONTRACT.publishedResetOnInit
const RESET_ON_INIT = [
  "30 - Áreas/Blog/Jardim digital - por onde começar.md",
  "40 - Recursos/Mermaid.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Configurando com Devcontainer.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Configurando Localmente.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Depois da Recepcao do Template.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Entendendo a Estrutura de Pastas.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Exploracao Guiada do Vault.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Guia do Jardineiro Digital.md",
  "99 - Meta e Anexos/99.1 - Onboarding/MOC Vault Seed.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Preparando seu Computador para o Vault.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Seus Primeiros Passos.md",
  "99 - Meta e Anexos/99.2 - Workflows/Automacoes no Obsidian.md",
  "99 - Meta e Anexos/99.2 - Workflows/Coletando Dados Locais com Scraping e OCR.md",
  "99 - Meta e Anexos/99.2 - Workflows/Configurando o Obsidian Git.md",
  "99 - Meta e Anexos/99.2 - Workflows/Criando seu Painel de Controle (Dashboard).md",
  "99 - Meta e Anexos/99.2 - Workflows/Inbox Soberana de Fontes.md",
  "99 - Meta e Anexos/99.2 - Workflows/O Ciclo de Vida do Conhecimento (Versionamento para Jardineiros Digitais).md",
  "99 - Meta e Anexos/99.2 - Workflows/Outbox Soberana de Publicação.md",
  "99 - Meta e Anexos/99.2 - Workflows/Preparando Dados para o Lab.md",
  "99 - Meta e Anexos/99.2 - Workflows/Publicando e Consumindo RSS no Vault.md",
  "99 - Meta e Anexos/99.2 - Workflows/Publicando seu Vault como Site.md",
  "99 - Meta e Anexos/99.2 - Workflows/Rotina de Curadoria Editorial.md",
  "99 - Meta e Anexos/99.2 - Workflows/Usando o Git e o GitHub para Sincronizar seu Vault.md",
  "99 - Meta e Anexos/99.2 - Workflows/Usando o Lab (Notebooks Marimo).md",
  "99 - Meta e Anexos/99.3 - Referência/Automatizando a Inicialização do Vault.md",
  "99 - Meta e Anexos/99.3 - Referência/Conhecendo o Agents Lab.md",
  "99 - Meta e Anexos/99.3 - Referência/Convenções e Boas Práticas.md",
  "99 - Meta e Anexos/99.3 - Referência/Ecossistema aretw0 Agents Lab e Refarm.md",
  "99 - Meta e Anexos/99.3 - Referência/Evoluindo seu Vault com Links, Tags e MOCs.md",
  "99 - Meta e Anexos/99.3 - Referência/Identidade Visual e Blocos de Interface.md",
  "99 - Meta e Anexos/99.3 - Referência/Integrando com VSCode (Foam).md",
  "99 - Meta e Anexos/99.3 - Referência/Plugins Essenciais e Recomendados.md",
  "99 - Meta e Anexos/99.3 - Referência/Qualidade e Lint de Notas.md",
  "99 - Meta e Anexos/99.3 - Referência/Usando com Agentes de IA.md",
  "99 - Meta e Anexos/99.3 - Referência/Usando o Plugin Templates.md",
  "99 - Meta e Anexos/99.3 - Referência/Usando o Vault no Celular vs. Desktop.md",
  "99 - Meta e Anexos/99.3 - Referência/Visualização do Fluxo do Vault.md",
  "99 - Meta e Anexos/Diagramas/Exemplos.md",
];

// Matches the bash sed: s/^status: published$/status: draft/
// Applied line-by-line to simulate what GNU sed does.
function applyReset(content) {
  return content
    .split(/\r?\n/)
    .map((line) => (line === "status: published" ? "status: draft" : line))
    .join("\n");
}

function extractStatus(content) {
  const m = content.replace(/^﻿/, "").match(/^---[\s\S]*?^status:\s*(\S+)/m);
  return m ? m[1] : null;
}

const errors = [];

for (const notePath of RESET_ON_INIT) {
  const fullPath = join(root, notePath);

  if (!existsSync(fullPath)) {
    errors.push(`MISSING: ${notePath}`);
    continue;
  }

  const original = readFileSync(fullPath, "utf8");
  const originalStatus = extractStatus(original);

  if (originalStatus !== "published") {
    errors.push(`NOT PUBLISHED: ${notePath} — got: ${originalStatus ?? "(absent)"}`);
    continue;
  }

  const reset = applyReset(original);
  const resetStatus = extractStatus(reset);

  if (resetStatus !== "draft") {
    errors.push(`RESET FAILED: ${notePath} — sed would produce: ${resetStatus ?? "(absent)"}`);
  }
}

if (errors.length > 0) {
  console.error("Initialize reset simulation failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Initialize reset simulation passed — ${RESET_ON_INIT.length} notes would arrive as draft.`);
