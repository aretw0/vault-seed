// Audits which published vault notes appear in each sidebar section.
// Run: node scripts/audit_sidebar.js
//
// Output:
//   - Each configured sidebar section with its matching vault entries
//   - Notes appearing in multiple sections (intentional duplicates)
//   - Published vault notes appearing in NO section (navigation orphans)
//
// Sidebar sections are loaded from .site/sidebar.sections.json, the same data
// re-exported by .site/sidebar.config.ts for Astro/Starlight.

const fs = require('node:fs');
const path = require('node:path');
const { globSync } = require('glob');
const matter = require('gray-matter');
const { folders: VAULT_FOLDERS } = require('../.site/vault-folders.json');
const sidebarSections = require('../.site/sidebar.sections.json');

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

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  return [];
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => a.order !== b.order ? a.order - b.order : a.title.localeCompare(b.title, 'pt'));
}

function sectionType(section) {
  if ('intent' in section) return `intent:${section.intent}`;
  if ('directory' in section) return `directory:${section.directory}`;
  if ('tag' in section) return `tag:${section.tag}`;
  return `property:${section.property}=${section.value}`;
}

async function main() {
  const { deriveNoteIntents, loadInformationArchitecture } = await import('../.site/lib/information-architecture.mjs');

  // ── collect published vault entries ─────────────────────────────────────────

  const root = process.cwd();
  const informationArchitecture = loadInformationArchitecture(root);
  const patterns = VAULT_FOLDERS.map(f => `${f}/**/*.md`);
  const files = globSync(patterns, { cwd: root });

  const entries = [];
  for (const file of files) {
    const normalizedFile = file.replace(/\\/g, '/');
    const raw = fs.readFileSync(path.join(root, file), 'utf-8');
    const { data } = matter(raw);
    if (data.status !== 'published') continue;

    const slug = slugify(normalizedFile.replace(/\.md$/, ''));
    const title = (typeof data.title === 'string' ? data.title : null) ?? path.basename(file, '.md');
    const tags = normalizeList(data.tags);
    const order = data.sidebar?.order ?? 999;
    const folder = normalizedFile.split('/')[0] ?? '';
    entries.push({ slug, title, tags, data, order, folder });
  }

  const sortedEntries = sortEntries(entries);

  // ── resolve sections ────────────────────────────────────────────────────────

  /** @type {Map<string, {label:string, type:string, entries: typeof sortedEntries}>} */
  const resolvedSections = new Map();

  for (const section of sidebarSections) {
    let matched;
    if ('intent' in section) {
      matched = sortedEntries.filter(e => deriveNoteIntents(
        {
          folder: e.folder,
          tags: e.tags,
          category: String(e.data.category ?? ''),
        },
        informationArchitecture,
      ).includes(section.intent));
    } else if ('directory' in section) {
      matched = sortedEntries.filter(e => e.slug.startsWith(section.directory + '/'));
    } else if ('tag' in section) {
      matched = sortedEntries.filter(e => e.tags.includes(section.tag));
    } else {
      matched = sortedEntries.filter(e => e.data[section.property] === section.value);
    }

    resolvedSections.set(section.label, { label: section.label, type: sectionType(section), entries: matched });
  }

  // ── tally appearances per entry ─────────────────────────────────────────────

  const appearanceCount = new Map(); // slug → count
  for (const { entries: sectionEntries } of resolvedSections.values()) {
    for (const e of sectionEntries) {
      appearanceCount.set(e.slug, (appearanceCount.get(e.slug) ?? 0) + 1);
    }
  }

  const appearedSlugs = new Set(
    [...resolvedSections.values()].flatMap(s => s.entries.map(e => e.slug)),
  );
  const orphans = sortedEntries.filter(e => !appearedSlugs.has(e.slug));
  const duplicates = sortedEntries.filter(e => (appearanceCount.get(e.slug) ?? 0) > 1);

  // ── report ──────────────────────────────────────────────────────────────────

  const RESET = '\x1b[0m';
  const BOLD  = '\x1b[1m';
  const DIM   = '\x1b[2m';
  const CYAN  = '\x1b[36m';
  const YELLOW = '\x1b[33m';
  const RED   = '\x1b[31m';
  const GREEN = '\x1b[32m';
  const MAGENTA = '\x1b[35m';

  console.log(`\n${BOLD}Sidebar Audit${RESET}  (${sortedEntries.length} published vault notes)\n`);

  for (const { label, type, entries: sectionEntries } of resolvedSections.values()) {
    const isEmpty = sectionEntries.length === 0;
    const isTechnicalDocsSection = type === 'directory:docs';
    const marker = isEmpty
      ? isTechnicalDocsSection ? `${CYAN}i${RESET}` : `${RED}✗${RESET}`
      : `${GREEN}✔${RESET}`;
    console.log(`${marker} ${BOLD}${label}${RESET}  ${DIM}[${type}]${RESET}`);
    if (isEmpty) {
      const message = isTechnicalDocsSection
        ? 'technical docs are not counted as vault notes in this audit'
        : 'no matching vault entries — section hidden at build time';
      console.log(`  ${DIM}(${message})${RESET}`);
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

  // ── duplicates ──────────────────────────────────────────────────────────────

  if (duplicates.length > 0) {
    console.log(`${BOLD}${MAGENTA}Notes in multiple sections${RESET}  (${duplicates.length})`);
    console.log(`${DIM}These appear in more than one section — intentional cross-linking is fine,${RESET}`);
    console.log(`${DIM}but check for accidental over-classification.${RESET}\n`);
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

  // ── orphans ─────────────────────────────────────────────────────────────────

  if (orphans.length > 0) {
    console.log(`${BOLD}${YELLOW}Published vault notes not in any section${RESET}  (${orphans.length})`);
    console.log(`${DIM}These pages exist in the site but are unreachable from the sidebar.${RESET}`);
    console.log(`${DIM}Adjust .site/information-architecture.json or .site/sidebar.sections.json to surface them —${RESET}`);
    console.log(`${DIM}or leave them as deep-link-only pages if that's intentional.${RESET}\n`);
    for (const e of orphans) {
      const tagStr = e.tags.length ? `  ${DIM}tags: ${e.tags.join(', ')}${RESET}` : `  ${DIM}(no tags)${RESET}`;
      console.log(`  ${YELLOW}·${RESET} ${e.title}${tagStr}`);
      console.log(`    ${DIM}${e.slug}${RESET}`);
    }
    console.log();
  }

  // ── summary ─────────────────────────────────────────────────────────────────

  const totalSectioned = appearedSlugs.size;
  console.log(`${BOLD}Summary${RESET}`);
  console.log(`  ${totalSectioned} of ${sortedEntries.length} published vault notes reachable from sidebar`);
  if (orphans.length > 0)
    console.log(`  ${YELLOW}${orphans.length} orphan(s)${RESET} — not linked from sidebar`);
  if (duplicates.length > 0)
    console.log(`  ${MAGENTA}${duplicates.length} note(s)${RESET} appear in multiple sections`);
  console.log();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
