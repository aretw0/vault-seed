// Audits which published notes appear in each sidebar section.
// Run: node scripts/audit_sidebar.js
//
// Output:
//   - Each section with its entries (title, slug, tags)
//   - Notes appearing in multiple sections (intentional duplicates)
//   - Published notes appearing in NO section (navigation orphans)
//
// Keep sidebarSections in sync with .site/sidebar.config.ts manually.

const fs = require('node:fs');
const path = require('node:path');
const { globSync } = require('glob');
const matter = require('gray-matter');

// ── slugify (mirrors packages/astro-plugins/src/slugify.ts) ──────────────────

function slugify(input) {
  return input
    .split('/')
    .map(segment =>
      segment
        .replace(/^\d+\s*-\s*/, '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    )
    .filter(Boolean)
    .join('/');
}

// ── config (mirrors .site/sidebar.config.ts) ─────────────────────────────────
// IMPORTANT: keep in sync with sidebarSections in .site/sidebar.config.ts

const VAULT_FOLDERS = [
  '00 - Entrada', '10 - Diário', '20 - Projetos',
  '30 - Áreas', '40 - Recursos', '50 - Arquivo',
  '90 - Modelos', '99 - Meta e Anexos',
];

/** @type {Array<{label:string} & ({directory:string}|{tag:string}|{property:string,value:unknown})>} */
const sidebarSections = [
  { label: 'Primeiros Passos',  tag: 'meta/onboarding' },
  { label: 'Conceitos de PKM',  tag: 'conceito/pkm' },
  { label: 'Ferramentas',       tag: 'recurso/ferramenta' },
  { label: 'Meta',              directory: 'meta-e-anexos' },
];

// ── collect published entries ─────────────────────────────────────────────────

const root = process.cwd();
const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
const files = globSync(patterns, { cwd: root });

const entries = [];
for (const file of files) {
  const raw = fs.readFileSync(path.join(root, file), 'utf-8');
  const { data } = matter(raw);
  if (data.status !== 'published') continue;

  const slug = slugify(file.replace(/\\/g, '/').replace(/\.md$/, ''));
  const title = (typeof data.title === 'string' ? data.title : null) ?? path.basename(file, '.md');
  const tags = Array.isArray(data.tags) ? data.tags : [];
  const order = data.sidebar?.order ?? 999;
  entries.push({ slug, title, tags, data, order });
}

entries.sort((a, b) => a.order !== b.order ? a.order - b.order : a.title.localeCompare(b.title, 'pt'));

// ── resolve sections ──────────────────────────────────────────────────────────

/** @type {Map<string, {label:string, type:string, entries: typeof entries}>} */
const resolvedSections = new Map();

for (const section of sidebarSections) {
  let matched;
  if ('directory' in section) {
    matched = entries.filter(e => e.slug.startsWith(section.directory + '/'));
  } else if ('tag' in section) {
    matched = entries.filter(e => e.tags.includes(section.tag));
  } else {
    matched = entries.filter(e => e.data[section.property] === section.value);
  }

  const type = 'directory' in section ? `directory:${section.directory}`
    : 'tag' in section ? `tag:${section.tag}`
    : `property:${section.property}=${section.value}`;

  resolvedSections.set(section.label, { label: section.label, type, entries: matched });
}

// ── tally appearances per entry ───────────────────────────────────────────────

const appearanceCount = new Map(); // slug → count
for (const { entries: sectionEntries } of resolvedSections.values()) {
  for (const e of sectionEntries) {
    appearanceCount.set(e.slug, (appearanceCount.get(e.slug) ?? 0) + 1);
  }
}

const publishedSlugs = new Set(entries.map(e => e.slug));
const appearedSlugs = new Set(
  [...resolvedSections.values()].flatMap(s => s.entries.map(e => e.slug)),
);
const orphans = entries.filter(e => !appearedSlugs.has(e.slug));
const duplicates = entries.filter(e => (appearanceCount.get(e.slug) ?? 0) > 1);

// ── report ────────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const CYAN  = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RED   = '\x1b[31m';
const GREEN = '\x1b[32m';
const MAGENTA = '\x1b[35m';

console.log(`\n${BOLD}Sidebar Audit${RESET}  (${entries.length} published notes)\n`);

for (const { label, type, entries: sectionEntries } of resolvedSections.values()) {
  const isEmpty = sectionEntries.length === 0;
  const marker = isEmpty ? `${RED}✗${RESET}` : `${GREEN}✔${RESET}`;
  console.log(`${marker} ${BOLD}${label}${RESET}  ${DIM}[${type}]${RESET}`);
  if (isEmpty) {
    console.log(`  ${DIM}(no matching entries — section hidden at build time)${RESET}`);
  } else {
    for (const e of sectionEntries) {
      const multi = (appearanceCount.get(e.slug) ?? 0) > 1;
      const multiMark = multi ? ` ${MAGENTA}[+multi]${RESET}` : '';
      const tagStr = e.tags.length ? `  ${DIM}tags: ${e.tags.join(', ')}${RESET}` : '';
      console.log(`  ${CYAN}·${RESET} ${e.title}${multiMark}${tagStr}`);
      console.log(`    ${DIM}${e.slug}${RESET}`);
    }
  }
  console.log();
}

// ── duplicates ────────────────────────────────────────────────────────────────

if (duplicates.length > 0) {
  console.log(`${BOLD}${MAGENTA}Notes in multiple sections${RESET}  (${duplicates.length})`);
  console.log(`${DIM}These appear in more than one section — intentional cross-linking is fine,${RESET}`);
  console.log(`${DIM}but check for accidental double-tagging.${RESET}\n`);
  for (const e of duplicates) {
    const inSections = [...resolvedSections.values()]
      .filter(s => s.entries.some(se => se.slug === e.slug))
      .map(s => s.label);
    console.log(`  ${MAGENTA}·${RESET} ${e.title}`);
    console.log(`    ${DIM}${e.slug}${RESET}`);
    console.log(`    sections: ${inSections.join(', ')}`);
  }
  console.log();
}

// ── orphans ───────────────────────────────────────────────────────────────────

if (orphans.length > 0) {
  console.log(`${BOLD}${YELLOW}Published but not in any section${RESET}  (${orphans.length})`);
  console.log(`${DIM}These pages exist in the site but are unreachable from the sidebar.${RESET}`);
  console.log(`${DIM}Add a tag, directory, or property rule to surface them — or leave them${RESET}`);
  console.log(`${DIM}as deep-link-only pages if that's intentional.${RESET}\n`);
  for (const e of orphans) {
    const tagStr = e.tags.length ? `  ${DIM}tags: ${e.tags.join(', ')}${RESET}` : `  ${DIM}(no tags)${RESET}`;
    console.log(`  ${YELLOW}·${RESET} ${e.title}${tagStr}`);
    console.log(`    ${DIM}${e.slug}${RESET}`);
  }
  console.log();
}

// ── summary ───────────────────────────────────────────────────────────────────

const totalSectioned = appearedSlugs.size;
console.log(`${BOLD}Summary${RESET}`);
console.log(`  ${totalSectioned} of ${entries.length} published notes reachable from sidebar`);
if (orphans.length > 0)
  console.log(`  ${YELLOW}${orphans.length} orphan(s)${RESET} — not linked from sidebar`);
if (duplicates.length > 0)
  console.log(`  ${MAGENTA}${duplicates.length} note(s)${RESET} appear in multiple sections`);
console.log();
