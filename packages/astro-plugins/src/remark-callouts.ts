import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Blockquote, Paragraph, Text, RootContent, PhrasingContent } from 'mdast';

interface CalloutTypeConfig {
  color?: string;
}

interface CalloutOptions {
  types?: Record<string, CalloutTypeConfig>;
}

const DEFAULT_TYPES: Record<string, CalloutTypeConfig> = {
  note: { color: '#448aff' },
  tip: { color: '#00c853' },
  warning: { color: '#ffab00' },
  danger: { color: '#ff5252' },
};

const TYPE_ALIASES: Record<string, string> = {
  hint: 'tip',
  important: 'warning',
  attention: 'warning',
  caution: 'warning',
  error: 'danger',
  bug: 'danger',
  failure: 'danger',
  fail: 'danger',
  missing: 'danger',
  info: 'note',
  abstract: 'note',
  summary: 'note',
  tldr: 'note',
  todo: 'note',
};

function normalizeCalloutType(raw: string): string {
  const lower = raw.toLowerCase();
  return TYPE_ALIASES[lower] ?? lower;
}

function defaultTitleForType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function parseInlineMarkdown(text: string): PhrasingContent[] {
  const tree = unified().use(remarkParse).parse(text) as Root;
  const firstParagraph = tree.children.find((n) => n.type === 'paragraph') as Paragraph | undefined;
  return firstParagraph ? firstParagraph.children : [{ type: 'text', value: text }];
}

const remarkCallouts: Plugin<[CalloutOptions?], Root> = (options = {}) => {
  const types = { ...DEFAULT_TYPES, ...(options.types ?? {}) };

  return (tree) => {
    visit(tree, 'blockquote', (node: Blockquote, index: number | undefined, parent) => {
      if (index === undefined || !parent) return;

      // The first child must be a paragraph whose first text starts with [!TYPE]
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;

      const firstText = firstChild.children[0];
      if (!firstText || firstText.type !== 'text') return;

      const headerMatch = /^\[!([^\]]+)\](.*)/.exec(firstText.value);
      if (!headerMatch) return;

      const rawType = headerMatch[1].trim();
      const titleRemainder = headerMatch[2].trim();
      const normalizedType = normalizeCalloutType(rawType);
      const typeConfig = types[normalizedType] ?? {};
      const title = titleRemainder || defaultTitleForType(normalizedType);

      // Build the aside HTML element via raw HTML nodes
      const colorStyle = typeConfig.color ? ` style="--callout-color: ${typeConfig.color}"` : '';
      const openTag =
        `<aside class="callout callout-${normalizedType}" role="note" aria-label="${title}" data-callout="${rawType.toLowerCase()}"${colorStyle}>` +
        `<div class="callout-title">${title}</div>` +
        `<div class="callout-content">`;

      // Collect body children (everything after the first paragraph's header line)
      const bodyChildren: RootContent[] = [];

      // Handle remainder of header paragraph (text after [!TYPE] title line)
      const headerParagraphRemainder = firstChild.children.slice(1);
      if (headerParagraphRemainder.length > 0) {
        bodyChildren.push({ type: 'paragraph', children: headerParagraphRemainder } as Paragraph);
      }

      // Add remaining blockquote children
      for (let i = 1; i < node.children.length; i++) {
        bodyChildren.push(node.children[i]);
      }

      const replacementNodes: RootContent[] = [
        { type: 'html', value: openTag },
        ...bodyChildren,
        { type: 'html', value: '</div></aside>' },
      ];

      parent.children.splice(index, 1, ...replacementNodes);

      // Return the index adjustment to avoid re-visiting inserted nodes
      return index + replacementNodes.length;
    });
  };
};

export default remarkCallouts;
