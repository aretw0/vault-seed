#!/usr/bin/env node
// Emite recibos de consumerProof para um packet de handoff do Refarm.
//
// ADR-080 decidiu que provas downstream devolvem recibos "as plain files, not
// machinery": um JSON por proof ao lado do packet, com proofId, commit do
// consumidor, sha256 do manifest, comandos executados e resultado. Sem schema,
// sem validador, sem CI. Um recibo é memória, não produto.
//
// A ligação proofId -> teste não é um mapa mantido à mão: cada teste de
// contrato já declara o pacote que consome, e cada proof do manifest já
// carrega packageName. O script só lê os dois lados.
//
//   node scripts/emit_refarm_proof_receipts.mjs <dir-do-packet> [--dry-run]

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const packetDir = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!packetDir) {
  console.error("uso: node scripts/emit_refarm_proof_receipts.mjs <dir-do-packet> [--dry-run]");
  process.exit(64);
}

const manifestPath = join(resolve(packetDir), "manifest.json");
let manifestRaw;
try {
  manifestRaw = readFileSync(manifestPath);
} catch {
  console.error(`packet sem manifest.json: ${manifestPath}`);
  console.error("um diretório sem manifest não é um packet (ADR-080).");
  process.exit(2);
}

const manifest = JSON.parse(manifestRaw.toString("utf8"));
const manifestSha256 = createHash("sha256").update(manifestRaw).digest("hex");
const proofs = manifest.consumerProofs ?? [];

// Cada teste de contrato referencia os pacotes que consome. Um teste que prova
// suporte transitivo referencia mais de um, e existe um proof para cada — por
// isso o casamento é por TODOS os pacotes citados, não pelo "principal".
const testFiles = readdirSync(join(ROOT, "scripts"))
  .filter((f) => /^refarm_.*contract\.test\.mjs$/.test(f))
  .sort();

const testOfPkg = new Map();
for (const file of testFiles) {
  const src = readFileSync(join(ROOT, "scripts", file), "utf8");
  const packages = new Set(src.match(/@refarm\.dev\/[a-z0-9-]+/g) ?? []);
  for (const pkg of packages) {
    if (!testOfPkg.has(pkg)) testOfPkg.set(pkg, []);
    testOfPkg.get(pkg).push(file);
  }
}

const matched = proofs.filter((p) => testOfPkg.has(p.packageName));
const unproven = proofs.filter((p) => !testOfPkg.has(p.packageName));

console.log(`packet:   ${manifest.source} ${manifest.generatedAt ?? ""}`);
console.log(`proofs:   ${proofs.length}  com prova local: ${matched.length}  sem prova: ${unproven.length}`);

if (matched.length === 0) {
  console.error("nenhum proof deste packet tem prova local. Nada a emitir.");
  process.exit(3);
}

// O consumidor é o repositório que executa a prova, não o nome do packet.
const consumerName = basename(
  execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: ROOT }).toString().trim(),
);
const consumerCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString().trim();
const consumerDirty =
  execFileSync("git", ["status", "--porcelain"], { cwd: ROOT }).toString().trim().length > 0;

const filesToRun = [...new Set(matched.flatMap((p) => testOfPkg.get(p.packageName)))].sort();
const command = [
  "node",
  "node_modules/vitest/vitest.mjs",
  "--config",
  "./vitest.config.mjs",
  "--configLoader",
  "runner",
  "run",
  ...filesToRun.map((f) => `scripts/${f}`),
];

console.log(`rodando ${filesToRun.length} arquivos de contrato...`);
let result = "pass";
let output = "";
try {
  output = execFileSync(command[0], command.slice(1), { cwd: ROOT, stdio: "pipe" }).toString();
} catch (error) {
  result = "fail";
  output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
}
console.log(`resultado: ${result}`);

if (result === "fail") {
  console.error(output.split("\n").slice(-25).join("\n"));
  console.error("prova vermelha: nenhum recibo emitido.");
  process.exit(1);
}

const generatedAt = new Date().toISOString();
const receiptsDir = join(resolve(packetDir), "receipts");
if (!dryRun) mkdirSync(receiptsDir, { recursive: true });

for (const proof of matched) {
  const files = testOfPkg.get(proof.packageName);
  const receipt = {
    proofId: proof.proofId,
    packageName: proof.packageName,
    consumer: consumerName,
    consumerCommit,
    consumerDirty,
    manifestSha256,
    generatedAt,
    commands: [
      ["node", "node_modules/vitest/vitest.mjs", "--config", "./vitest.config.mjs",
       "--configLoader", "runner", "run", ...files.map((f) => `scripts/${f}`)].join(" "),
    ],
    result,
    proofTarget: proof.proofTarget,
  };
  const out = join(receiptsDir, `${proof.proofId}.json`);
  if (dryRun) {
    console.log(`  [dry-run] ${proof.proofId}`);
  } else {
    writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(`  recibo: ${proof.proofId}`);
  }
}

if (unproven.length > 0) {
  console.log(`\nsem prova local neste consumidor (${unproven.length}):`);
  for (const p of unproven) console.log(`  ${p.proofId}  (${p.packageName})`);
}
