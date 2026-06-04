// Scores common Portuguese accent drift in prose text.
// Run: node scripts/check_pt_text.js
// Machine-readable report: node scripts/check_pt_text.js --json
// Gate with a non-zero budget while paying down debt: --max-score=3
//
// Safe to add to CI and share with vault users. Exits 1 when score > max-score.
//
// Skips intentionally non-prose content:
//   - YAML/Astro frontmatter
//   - [[wikilinks]] — filename references that must stay unchanged
//   - fenced code blocks (```...```) — code examples
//   - inline code spans — paths, commands, identifiers
//   - Astro/HTML <script> and <style> blocks
//
// Keep ACCENT_RULES in sync with the patterns actually used in public prose.

const fs = require('node:fs');
const path = require('node:path');
const { globSync } = require('glob');
const { folders: VAULT_FOLDERS } = require('../.site/vault-folders.json');

// ── accent rules ─────────────────────────────────────────────────────────────
// Each rule has a stable id and weight so drift can be scored deterministically.
// Word boundaries prevent matching mid-word (e.g. "panorama" won't match "nao").

const ACCENT_RULES = [
  { id: 'nao', pattern: /\bnao\b/gi, suggestion: 'nao → não', weight: 1 },
  { id: 'sao', pattern: /\bsao\b/gi, suggestion: 'sao → são', weight: 1 },
  { id: 'tambem', pattern: /\btambem\b/gi, suggestion: 'tambem → também', weight: 1 },
  { id: 'voce', pattern: /\bvoce\b/gi, suggestion: 'voce → você', weight: 1 },
  { id: 'usuario', pattern: /\busuario\b/gi, suggestion: 'usuario → usuário', weight: 1 },
  { id: 'usuarios', pattern: /\busuarios\b/gi, suggestion: 'usuarios → usuários', weight: 1 },
  { id: 'diretorio', pattern: /\bdiretorio\b/gi, suggestion: 'diretorio → diretório', weight: 1 },
  { id: 'diretorios', pattern: /\bdiretorios\b/gi, suggestion: 'diretorios → diretórios', weight: 1 },
  { id: 'repositorio', pattern: /\brepositorio\b/gi, suggestion: 'repositorio → repositório', weight: 1 },
  { id: 'repositorios', pattern: /\brepositorios\b/gi, suggestion: 'repositorios → repositórios', weight: 1 },
  { id: 'referencia', pattern: /\breferencia\b/gi, suggestion: 'referencia → referência', weight: 1 },
  { id: 'referencias', pattern: /\breferencias\b/gi, suggestion: 'referencias → referências', weight: 1 },
  { id: 'relacao', pattern: /\brelacao\b/gi, suggestion: 'relacao → relação', weight: 1 },
  { id: 'operacao', pattern: /\boperacao\b/gi, suggestion: 'operacao → operação', weight: 1 },
  { id: 'orquestracao', pattern: /\borquestracao\b/gi, suggestion: 'orquestracao → orquestração', weight: 1 },
  { id: 'incubacao', pattern: /\bincubacao\b/gi, suggestion: 'incubacao → incubação', weight: 1 },
  { id: 'laboratorio', pattern: /\blaboratorio\b/gi, suggestion: 'laboratorio → laboratório', weight: 1 },
  { id: 'unica', pattern: /\bunica\b/gi, suggestion: 'unica → única', weight: 1 },
  { id: 'reutilizavel', pattern: /\breutilizavel\b/gi, suggestion: 'reutilizavel → reutilizável', weight: 1 },
  { id: 'extensao', pattern: /\bextensao\b/gi, suggestion: 'extensao → extensão', weight: 1 },
  { id: 'extensoes', pattern: /\bextensoes\b/gi, suggestion: 'extensoes → extensões', weight: 1 },
  { id: 'versao', pattern: /\bversao\b/gi, suggestion: 'versao → versão', weight: 1 },
  { id: 'secao', pattern: /\bsecao\b/gi, suggestion: 'secao → seção', weight: 1 },
  { id: 'secoes', pattern: /\bsecoes\b/gi, suggestion: 'secoes → seções', weight: 1 },
  { id: 'opcao', pattern: /\bopcao\b/gi, suggestion: 'opcao → opção', weight: 1 },
  { id: 'opcoes', pattern: /\bopcoes\b/gi, suggestion: 'opcoes → opções', weight: 1 },
  { id: 'tecnica', pattern: /\btecnica\b/gi, suggestion: 'tecnica → técnica', weight: 1 },
  { id: 'tecnicas', pattern: /\btecnicas\b/gi, suggestion: 'tecnicas → técnicas', weight: 1 },
  { id: 'tecnico', pattern: /\btecnico\b/gi, suggestion: 'tecnico → técnico', weight: 1 },
  { id: 'tecnicos', pattern: /\btecnicos\b/gi, suggestion: 'tecnicos → técnicos', weight: 1 },
  { id: 'automatico', pattern: /\bautomatico\b/gi, suggestion: 'automatico → automático', weight: 1 },
  { id: 'automatica', pattern: /\bautomatica\b/gi, suggestion: 'automatica → automática', weight: 1 },
  { id: 'automaticos', pattern: /\bautomaticos\b/gi, suggestion: 'automaticos → automáticos', weight: 1 },
  { id: 'automaticas', pattern: /\bautomaticas\b/gi, suggestion: 'automaticas → automáticas', weight: 1 },
  { id: 'configuracao', pattern: /\bconfiguracao\b/gi, suggestion: 'configuracao → configuração', weight: 1 },
  { id: 'validacao', pattern: /\bvalidacao\b/gi, suggestion: 'validacao → validação', weight: 1 },
  { id: 'seguranca', pattern: /\bseguranca\b/gi, suggestion: 'seguranca → segurança', weight: 1 },
  { id: 'manutencao', pattern: /\bmanutencao\b/gi, suggestion: 'manutencao → manutenção', weight: 1 },
  { id: 'historico', pattern: /\bhistorico\b/gi, suggestion: 'historico → histórico', weight: 1 },
  { id: 'integracao', pattern: /\bintegracao\b/gi, suggestion: 'integracao → integração', weight: 1 },
  { id: 'sincronizacao', pattern: /\bsincronizacao\b/gi, suggestion: 'sincronizacao → sincronização', weight: 1 },
  { id: 'publicacao', pattern: /\bpublicacao\b/gi, suggestion: 'publicacao → publicação', weight: 1 },
  { id: 'producao', pattern: /\bproducao\b/gi, suggestion: 'producao → produção', weight: 1 },
  { id: 'resolucao', pattern: /\bresolucao\b/gi, suggestion: 'resolucao → resolução', weight: 1 },
  { id: 'execucao', pattern: /\bexecucao\b/gi, suggestion: 'execucao → execução', weight: 1 },
  { id: 'geracao', pattern: /\bgeracao\b/gi, suggestion: 'geracao → geração', weight: 1 },
  { id: 'convencao', pattern: /\bconvencao\b/gi, suggestion: 'convencao → convenção', weight: 1 },
  { id: 'convencoes', pattern: /\bconvencoes\b/gi, suggestion: 'convencoes → convenções', weight: 1 },
  { id: 'organizacao', pattern: /\borganizacao\b/gi, suggestion: 'organizacao → organização', weight: 1 },
  { id: 'documentacao', pattern: /\bdocumentacao\b/gi, suggestion: 'documentacao → documentação', weight: 1 },
  { id: 'recepcao', pattern: /\brecepcao\b/gi, suggestion: 'recepcao → recepção', weight: 1 },
  { id: 'exploracao', pattern: /\bexploracao\b/gi, suggestion: 'exploracao → exploração', weight: 1 },
  { id: 'automacao', pattern: /\bautomacao\b/gi, suggestion: 'automacao → automação', weight: 1 },
  { id: 'automacoes', pattern: /\bautomacoes\b/gi, suggestion: 'automacoes → automações', weight: 1 },
  { id: 'inicializacao', pattern: /\binicializacao\b/gi, suggestion: 'inicializacao → inicialização', weight: 1 },
];

const PROSE_SCOPES = [
  { id: 'vault', patterns: VAULT_FOLDERS.map((folder) => `${folder}/**/*.md`) },
  { id: 'templates', patterns: ['90 - Modelos/**/*.md'] },
  { id: 'docs', patterns: ['docs/**/*.md'], ignore: ['docs/superpowers/**'] },
  { id: 'entrypoints', patterns: ['README.md', 'README.template.md'] },
  { id: 'agent-prompts', patterns: ['.github/prompts/**/*.md', '.github/PULL_REQUEST_TEMPLATE/**/*.md'] },
  { id: 'site', patterns: ['.site/pages/**/*.astro', '.site/components/**/*.astro'] },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function blank(match) {
  return match.replace(/[^\n]/g, ' ');
}

/**
 * Returns a version of raw text with non-prose content blanked out.
 * Blanking (not removing) preserves line/column positions for error messages.
 */
function stripNonProse(raw, file = '') {
  let text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  // Blank wikilinks: [[...]] → spaces of same length.
  text = text.replace(/\[\[[^\]]*\]\]/g, blank);

  // Keep Markdown link text as prose, but blank the destination.
  text = text.replace(/\[([^\]\n]+)\]\(([^)]+)\)/g, (match, label) => label + ' '.repeat(match.length - label.length));

  // Blank fenced code blocks (``` or ~~~, optionally indented or with lang).
  text = text.replace(/^([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?\n\1\2\s*$/gm, blank);

  // Blank inline code spans, commonly used for file paths and machine identifiers.
  text = text.replace(/`[^`\n]+`/g, blank);

  // Blank YAML frontmatter in Markdown and code frontmatter in Astro.
  text = text.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/m, blank);

  if (file.endsWith('.astro')) {
    // Inline code and CSS are not prose, but text nodes between tags are.
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, blank);
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, blank);
    text = text.replace(/<[^>]+>/g, blank);
    text = text.replace(/\{[^{}]*\}/g, blank);
  }

  return text;
}

function lineAndColumn(text, index) {
  const prefix = text.slice(0, index);
  const lines = prefix.split('\n');
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

function scanText(raw, { file = '<memory>', scope = 'memory', rules = ACCENT_RULES } = {}) {
  const prose = stripNonProse(raw, file);
  const issues = [];

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(prose)) !== null) {
      const { line, column } = lineAndColumn(raw, match.index);
      issues.push({
        file,
        scope,
        line,
        column,
        ruleId: rule.id,
        suggestion: rule.suggestion,
        match: match[0],
        weight: rule.weight,
      });
    }
  }

  return issues.sort((a, b) => a.file.localeCompare(b.file, 'pt') || a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId));
}

function listScopeFiles(root, scope) {
  const files = globSync(scope.patterns, {
    cwd: root,
    nodir: true,
    ignore: scope.ignore || [],
  });
  return [...new Set(files)].sort((a, b) => a.localeCompare(b, 'pt'));
}

function summarizeIssues(issues) {
  const byScope = {};
  const byRule = {};

  for (const issue of issues) {
    byScope[issue.scope] = byScope[issue.scope] || { issues: 0, score: 0 };
    byScope[issue.scope].issues += 1;
    byScope[issue.scope].score += issue.weight;

    byRule[issue.ruleId] = byRule[issue.ruleId] || { issues: 0, score: 0, suggestion: issue.suggestion };
    byRule[issue.ruleId].issues += 1;
    byRule[issue.ruleId].score += issue.weight;
  }

  return { byScope, byRule };
}

function buildReport({ root = process.cwd(), scopes = PROSE_SCOPES, rules = ACCENT_RULES } = {}) {
  const files = [];
  const issues = [];

  for (const scope of scopes) {
    for (const file of listScopeFiles(root, scope)) {
      const absolute = path.join(root, file);
      const raw = fs.readFileSync(absolute, 'utf-8');
      files.push({ file, scope: scope.id });
      issues.push(...scanText(raw, { file, scope: scope.id, rules }));
    }
  }

  const score = issues.reduce((total, issue) => total + issue.weight, 0);
  return {
    schemaVersion: 1,
    score,
    issueCount: issues.length,
    scannedFileCount: files.length,
    files,
    issues,
    ...summarizeIssues(issues),
  };
}

function parseArgs(argv) {
  const args = { json: false, maxScore: Number(process.env.PT_TEXT_MAX_SCORE ?? 0) };
  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    if (arg.startsWith('--max-score=')) args.maxScore = Number(arg.slice('--max-score='.length));
  }
  if (!Number.isFinite(args.maxScore) || args.maxScore < 0) {
    throw new Error('--max-score must be a non-negative number');
  }
  return args;
}

function printHumanReport(report, maxScore) {
  if (report.score <= maxScore) {
    console.log(`check:pt-text passed — drift score ${report.score}/${maxScore} across ${report.scannedFileCount} prose file(s).`);
    return;
  }

  console.error(`check:pt-text failed — drift score ${report.score} exceeds max-score ${maxScore}.`);
  console.error(`Found ${report.issueCount} issue(s) across ${report.scannedFileCount} prose file(s).\n`);

  for (const [scope, summary] of Object.entries(report.byScope)) {
    console.error(`  scope:${scope} score=${summary.score} issues=${summary.issues}`);
  }

  console.error('\nTop issues:');
  for (const issue of report.issues.slice(0, 80)) {
    console.error(`  ${issue.file}:${issue.line}:${issue.column}  "${issue.match}" — ${issue.suggestion} (+${issue.weight})`);
  }
  if (report.issues.length > 80) {
    console.error(`  … ${report.issues.length - 80} more issue(s). Run with --json for the full report.`);
  }
  console.error('\nFix the issues above, or temporarily raise --max-score while paying down drift.');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = buildReport();

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report, args.maxScore);
  }

  if (report.score > args.maxScore) process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  ACCENT_RULES,
  PROSE_SCOPES,
  stripNonProse,
  scanText,
  buildReport,
  summarizeIssues,
};
