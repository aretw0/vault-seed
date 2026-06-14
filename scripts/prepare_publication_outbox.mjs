#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";
import matter from "gray-matter";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_OUTPUT = join(ROOT, "dados", "lab", "outbox-publicacao.json");
const OUTBOX_PATTERNS = [
  "00 - Entrada/**/*.md",
  "10 - Diário/**/*.md",
  "20 - Projetos/**/*.md",
  "30 - Áreas/**/*.md",
  "40 - Recursos/**/*.md",
  "50 - Arquivo/**/*.md",
  "99 - Meta e Anexos/**/*.md",
];

const CHANNELS = [
  {
    id: "site",
    title: "Site próprio",
    mode: "canonical",
    automation: "build estático",
    risk: "baixo",
    notes: "A nota publicada no vault é a referência principal.",
  },
  {
    id: "rss",
    title: "RSS/Atom",
    mode: "syndication",
    automation: "gerado pelo site",
    risk: "baixo",
    notes: "Distribui itens publicados sem depender de plataforma fechada.",
  },
  {
    id: "newsletter",
    title: "Newsletter",
    mode: "adaptation",
    automation: "rascunho assistido",
    risk: "médio",
    notes: "Exige revisão humana de tom, consentimento e links.",
  },
  {
    id: "mastodon",
    title: "Mastodon",
    mode: "social-adapter",
    automation: "dry-run primeiro",
    risk: "médio",
    notes: "Preferir API autenticada e postagem revisada.",
  },
  {
    id: "bluesky",
    title: "Bluesky",
    mode: "social-adapter",
    automation: "dry-run primeiro",
    risk: "médio",
    notes: "Gerar rascunho local antes de qualquer publicação.",
  },
  {
    id: "linkedin",
    title: "LinkedIn",
    mode: "social-adapter",
    automation: "manual ou assistido",
    risk: "alto",
    notes: "Evitar scraping agressivo; publicar apenas com revisão explícita.",
  },
  {
    id: "github",
    title: "GitHub Releases/Discussions",
    mode: "project-adapter",
    automation: "CLI/API autenticada",
    risk: "médio",
    notes: "Bom para changelogs, releases e discussões técnicas.",
  },
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function toArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function slugify(input) {
  return String(input || "post")
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    .replace(/^\d+\s*-\s*/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "post";
}

function excerpt(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("---"))
    .join(" ")
    .slice(0, 280);
}

function isOutboxCandidate(data) {
  return data.outbox === true || Boolean(data.publicationStatus) || toArray(data.channels).length > 0;
}

// Derives the public site URL using the same priority order as astro.config.mjs:
// ASTRO_SITE env → CNAME file → GITHUB_REPOSITORY → null (local dev / unknown).
function resolveSiteUrl(cwd) {
  if (process.env.ASTRO_SITE) return process.env.ASTRO_SITE.replace(/\/$/, "");
  const cnamePath = join(cwd, "CNAME");
  if (existsSync(cnamePath)) {
    const host = readFileSync(cnamePath, "utf8").trim();
    if (host) return `https://${host}`;
  }
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) {
    const [owner, name] = repo.split("/");
    return `https://${owner}.github.io/${name}`;
  }
  return null;
}

export function buildPublicationOutbox({ cwd = ROOT, outputPath = DEFAULT_OUTPUT, now } = {}) {
  const files = globSync(OUTBOX_PATTERNS, { cwd, nodir: true });
  const generatedAt = now || new Date(0).toISOString();
  const siteUrl = resolveSiteUrl(cwd);
  const items = files
    .map((file) => {
      const normalizedPath = file.replaceAll("\\", "/");
      const raw = readFileSync(join(cwd, file), "utf8");
      const { data, content } = matter(raw);
      if (!isOutboxCandidate(data)) return null;

      const channels = toArray(data.channels);
      const id = slugify(normalizedPath.replace(/\.md$/, ""));
      return {
        id,
        title: data.title ? String(data.title) : basename(file, ".md"),
        path: normalizedPath,
        url: siteUrl ? `${siteUrl}/${id}/` : null,
        status: data.status ? String(data.status) : "draft",
        publicationStatus: data.publicationStatus ? String(data.publicationStatus) : "draft",
        canonical: data.canonical ? String(data.canonical) : normalizedPath,
        source: data.source ? String(data.source) : normalizedPath,
        collectedAt: data.collectedAt ? String(data.collectedAt) : null,
        sha256: data.sha256 ? String(data.sha256) : sha256(raw),
        license: data.license ? String(data.license) : "verificar",
        privacy: data.privacy ? String(data.privacy) : "private-until-published",
        channels,
        channelCount: channels.length,
        audience: data.audience ? String(data.audience) : null,
        tags: toArray(data.tags),
        excerpt: excerpt(content),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path, "pt"));

  const payloadWithoutHash = {
    schemaVersion: 1,
    kind: "publication-outbox",
    source: "markdown-frontmatter:outbox|publicationStatus|channels",
    collectedAt: generatedAt,
    license: "derived-from-vault-notes",
    privacy: "review-before-publish",
    policy: {
      canonicalFirst: true,
      dryRunFirst: true,
      humanReviewRequired: true,
      noSecrets: true,
    },
    channels: CHANNELS,
    itemCount: items.length,
    items,
  };
  const payload = {
    ...payloadWithoutHash,
    sha256: sha256(JSON.stringify(payloadWithoutHash, null, 2)),
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { data: payload, outputPath };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { data, outputPath } = buildPublicationOutbox();
  console.log(`publication outbox: ${data.itemCount} item(s) -> ${outputPath}`);
}
