# @aretw0/dgk-astro-plugins

## 0.2.0

### Minor Changes

- efcee90: feat: initial release with remark plugins for vault publishing

  Includes three remark plugins ported from astro-vault: remarkWikiLinks (with
  published-slug gating for public/private visibility), remarkWikiImages
  (![[img.png]] → lazy-loaded img), and remarkCallouts (Obsidian callout syntax
  → HTML). Also exports the slugify utility used by the vault Content Layer loader.
