import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const base = import.meta.env.BASE_URL ?? '/';
const title = import.meta.env.VAULT_TITLE?.trim() || 'Vault Seed';
const description = 'Atualizações publicadas do vault.';
const fallbackSite = 'http://localhost:4321';

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target, alias) => alias || target)
    .replace(/[#>*_~\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function entryDate(entry: { data: Record<string, unknown> }): Date {
  const raw = entry.data.updated || entry.data.created;
  const parsed = raw ? new Date(String(raw)) : new Date(0);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function absoluteUrl(site: URL | undefined, path: string): string {
  const origin = site?.toString() || fallbackSite;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return new URL(`${normalizedBase}${path}`.replace(/^\/\//, '/'), origin).toString();
}

export const GET: APIRoute = async ({ site }) => {
  const entries = (await getCollection('docs'))
    .filter((entry) => entry.id !== '404' && entry.data.draft !== true && entry.data.pagefind !== false)
    .sort((a, b) => entryDate(b).getTime() - entryDate(a).getTime())
    .slice(0, 50);

  const siteUrl = absoluteUrl(site, '');
  const feedUrl = absoluteUrl(site, 'rss.xml');
  const items = entries
    .map((entry) => {
      const link = absoluteUrl(site, `${entry.id}/`);
      const date = entryDate(entry);
      const summary = stripMarkdown(entry.body || '').slice(0, 500);
      return `    <item>
      <title>${escapeXml(entry.data.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${date.toUTCString()}</pubDate>
      <description>${escapeXml(summary)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(description)}</description>
    <language>pt-BR</language>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
