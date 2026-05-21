// .site/sidebar.config.ts
//
// Defines the published site's left-hand navigation.
// Sections are independent of the vault's physical folder structure: a note
// can appear in a section simply because it has the right tag or property,
// without you ever having to move the file.
//
// Section types:
//
//   directory  — Starlight autogenerate; includes every published note whose
//                slug starts with the given prefix.  Respects sidebar.order /
//                sidebar.label set in the note's frontmatter.
//
//   tag        — Includes every published note whose `tags` array contains
//                the given value.  Great for cross-folder thematic groups.
//
//   property   — Includes every published note where frontmatter[property]
//                equals value.  Works with any scalar frontmatter field.
//
// Sections whose filter matches no published notes are hidden automatically.
// Notes can appear in more than one section (intentional: multiple paths to
// the same content).  Order within a section follows sidebar.order then title.

export type SidebarSection =
  | { label: string; directory: string; collapsed?: boolean }
  | { label: string; tag: string; collapsed?: boolean }
  | { label: string; property: string; value: unknown; collapsed?: boolean };

export const sidebarSections: SidebarSection[] = [
  { label: 'Primeiros Passos', tag: 'meta/onboarding' },
  { label: 'Conceitos de PKM', tag: 'conceito/pkm' },
  { label: 'Ferramentas',      directory: 'recursos' },
  { label: 'Meta',             directory: 'meta-e-anexos' },
];
