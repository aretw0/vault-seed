// .site/sidebar.config.ts
//
// Defines the published site's left-hand navigation.
// Sections are independent of the vault's physical folder structure: a note
// can appear in a section because it matches an information-architecture
// intent, tag, property, or directory.
//
// Prefer `intent` for user-facing navigation. It is backed by
// .site/information-architecture.json, so the site, audits, and exploration
// page share the same long-term vocabulary.
//
// Section types:
//
//   intent     — Includes every published note derived for an intent such as
//                comecar, organizar, explorar, publicar, automatizar, manter.
//
//   directory  — Starlight autogenerate; includes every published note whose
//                slug starts with the given prefix. Respects sidebar.order /
//                sidebar.label set in the note's frontmatter.
//
//   tag        — Includes every published note whose `tags` array contains
//                the given value.
//
//   property   — Includes every published note where frontmatter[property]
//                equals value.
//
// Sections whose filter matches no published notes are hidden automatically.
// Notes can appear in more than one section when that helps discovery.
// Order within a section follows sidebar.order then title.

export type SidebarSection =
  | { label: string; intent: string; collapsed?: boolean }
  | { label: string; directory: string; collapsed?: boolean }
  | { label: string; tag: string; collapsed?: boolean }
  | { label: string; property: string; value: unknown; collapsed?: boolean };

export const sidebarSections: SidebarSection[] = [
  { label: 'Começar',      intent: 'comecar' },
  { label: 'Organizar',    intent: 'organizar' },
  { label: 'Explorar',     intent: 'explorar' },
  { label: 'Publicar',     intent: 'publicar', collapsed: true },
  { label: 'Automatizar',  intent: 'automatizar', collapsed: true },
  { label: 'Manter',       intent: 'manter', collapsed: true },
  // Only appears in the original template repository: generated vaults remove docs/.
  { label: 'Docs técnicas', directory: 'docs', collapsed: true },
];
