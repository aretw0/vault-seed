/**
 * Guards the current initialize.yml status contract.
 *
 * The old reset step (published -> draft) was removed. Source onboarding notes
 * are already draft in vault-seed, while the generated vault only promotes the
 * welcome note to published during initialization.
 *
 * No files are modified. Run with: node scripts/smoke_initialize_reset.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));

const DRAFT_IN_SOURCE = [
  "99 - Meta e Anexos/99.1 - Onboarding/Configurando com Devcontainer.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Configurando Localmente.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Depois da Recepcao do Template.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Entendendo a Estrutura de Pastas.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Exploracao Guiada do Vault.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Guia do Jardineiro Digital.md",
  "99 - Meta e Anexos/99.1 - Onboarding/MOC Vault Seed.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Preparando seu Computador para o Vault.md",
  "99 - Meta e Anexos/99.1 - Onboarding/Seus Primeiros Passos.md",
];

function extractStatus(content) {
  const m = content.replace(/^\uFEFF/, "").match(/^---[\s\S]*?^status:\s*(\S+)/m);
  return m ? m[1] : null;
}

const errors = [];
const initializeWorkflow = readFileSync(join(root, ".github/workflows/initialize.yml"), "utf8");

if (initializeWorkflow.includes("status: published$/status: draft")) {
  errors.push("initialize.yml must not reset published notes to draft anymore.");
}

if (!initializeWorkflow.includes('sed -i \'s/^status: draft$/status: published/\' "00 - Entrada/Bem-vindo ao seu vault.md"')) {
  errors.push("initialize.yml must promote only the welcome note from draft to published.");
}

if (/VAULT_ADMIN_TOKEN|branches\/main\/protection|administration:\s*write/.test(initializeWorkflow)) {
  errors.push(
    "initialize.yml must not require or reference admin branch-protection setup. " +
    "Generated repositories do not have template secrets during first initialization.",
  );
}

for (const notePath of DRAFT_IN_SOURCE) {
  const fullPath = join(root, notePath);

  if (!existsSync(fullPath)) {
    errors.push(`MISSING: ${notePath}`);
    continue;
  }

  const status = extractStatus(readFileSync(fullPath, "utf8"));
  if (status !== "draft") {
    errors.push(`NOT DRAFT: ${notePath} — got: ${status ?? "(absent)"}`);
  }
}

if (errors.length > 0) {
  console.error("Initialize status contract failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Initialize status contract passed — ${DRAFT_IN_SOURCE.length} template-only/onboarding notes stay draft.`);
