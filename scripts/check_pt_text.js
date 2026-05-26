// Checks vault notes for common missing Portuguese accents in prose text.
// Run: node scripts/check_pt_text.js
//
// Safe to add to CI and share with vault users.  Exits 1 if issues found.
//
// Skips intentionally unaccented content:
//   - [[wikilinks]] — filename references that must stay unchanged
//   - fenced code blocks (```...```) — code examples
//   - YAML tags: array — tag identifiers are programmatic, not prose
//
// Keep ACCENT_RULES in sync with the patterns actually used in the vault.

const fs   = require('node:fs');
const path = require('node:path');
const { globSync } = require('glob');
const { folders: VAULT_FOLDERS } = require('../.site/vault-folders.json');

// ── accent rules ─────────────────────────────────────────────────────────────
// Each entry: [regex, suggestion]
// Word boundaries prevent matching mid-word (e.g. "panorama" won't match "nao").

const ACCENT_RULES = [
  [/\bnao\b/gi,            'nao → não'],
  [/\bsao\b/gi,            'sao → são'],
  [/\btambem\b/gi,         'tambem → também'],
  [/\bvoce\b/gi,           'voce → você'],
  [/\bversao\b/gi,         'versao → versão'],
  [/\bsecao\b/gi,          'secao → seção'],
  [/\bsecoes\b/gi,         'secoes → seções'],
  [/\bopcao\b/gi,          'opcao → opção'],
  [/\bopcoes\b/gi,         'opcoes → opções'],
  [/\bRecepcao\b/gi,       'Recepcao → Recepção'],
  [/\bExploracao\b/gi,     'Exploracao → Exploração'],
  [/\bAutomacao\b/gi,      'Automacao → Automação'],
  [/\bAutomacoes\b/gi,     'Automacoes → Automações'],
  [/\bInicializacao\b/gi,  'Inicializacao → Inicialização'],
  [/\bIntegracao\b/gi,     'Integracao → Integração'],
  [/\bSincronizacao\b/gi,  'Sincronizacao → Sincronização'],
  [/\bPublicacao\b/gi,     'Publicacao → Publicação'],
  [/\bProducao\b/gi,       'Producao → Produção'],
  [/\bResolucao\b/gi,      'Resolucao → Resolução'],
  [/\bExecucao\b/gi,       'Execucao → Execução'],
  [/\bGeracao\b/gi,        'Geracao → Geração'],
  [/\bConvencao\b/gi,      'Convencao → Convenção'],
  [/\bConvencoes\b/gi,     'Convencoes → Convenções'],
  // The next two are common but can appear legitimately in tag identifiers;
  // only flagged here when they appear in prose-scanned text (tags stripped).
  [/\bOrganizacao\b/gi,    'Organizacao → Organização (if in prose, not a tag)'],
  [/\bDocumentacao\b/gi,   'Documentacao → Documentação (if in prose, not a tag)'],
];

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a version of the raw note text with non-prose content blanked out:
 *   - YAML frontmatter tags: array
 *   - fenced code blocks
 *   - [[wikilinks]]
 * Blanking (not removing) preserves line/column positions for error messages.
 */
function stripNonProse(raw) {
  // Strip UTF-8 BOM so the frontmatter regex anchored at ^ can match.
  // Obsidian saves files with BOM by default.
  let text = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;

  // Blank wikilinks: [[...]] → spaces of same length
  text = text.replace(/\[\[[^\]]*\]\]/g, m => ' '.repeat(m.length));

  // Blank fenced code blocks (``` or ~~~, optionally indented or with lang)
  text = text.replace(/^([ \t]*)(```|~~~)[^\n]*\n[\s\S]*?\n\1\2\s*$/gm, m => '\n'.repeat(m.split('\n').length - 1));

  // Blank the tags: block in YAML frontmatter.
  // YAML frontmatter is between the first two --- lines.
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const fmStart = 4; // length of "---\n"
    const fmContent = fmMatch[1];
    // Find "tags:" block: the key and all indented lines that follow.
    const tagsBlocked = fmContent.replace(
      /(^tags:\s*\n(?:(?:  [ \t]*[^\n]*)\n)*)/m,
      m => ' '.repeat(m.length),
    );
    text = '---\n' + tagsBlocked + text.slice(fmStart + fmContent.length);
  }

  return text;
}

// ── scan ──────────────────────────────────────────────────────────────────────

const root = process.cwd();
const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
const files = globSync(patterns, { cwd: root });

const issues = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(root, file), 'utf-8');
  const prose = stripNonProse(raw);

  for (const [re, suggestion] of ACCENT_RULES) {
    re.lastIndex = 0;
    const m = re.exec(prose);
    if (m) {
      // Find line number
      const line = raw.slice(0, m.index).split('\n').length;
      issues.push({ file, line, suggestion, match: m[0] });
    }
  }
}

// ── report ────────────────────────────────────────────────────────────────────

if (issues.length === 0) {
  console.log('check:pt-text passed — no accent issues found in prose.');
  process.exit(0);
}

console.error(`check:pt-text found ${issues.length} issue(s):\n`);
for (const { file, line, suggestion, match } of issues) {
  console.error(`  ${file}:${line}  "${match}" — ${suggestion}`);
}
console.error('\nFix the issues above, then re-run.');
process.exit(1);
