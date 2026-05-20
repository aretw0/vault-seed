import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Image, Parent } from 'mdast';

interface Options {
  base?: string;
}

function filenameToAlt(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]/g, ' ')
    .trim();
}

const remarkWikiImages: Plugin<[Options?], Root> = (options = {}) => {
  const base = options.base ?? '';

  return (tree) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (index === undefined || !parent) return;

      const value = node.value;
      const imageRegex = /!\[\[(.*?)(?:\|(.*?))?\]\]/g;

      const children: (Text | Image)[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let hasMatch = false;

      while ((match = imageRegex.exec(value)) !== null) {
        hasMatch = true;
        const [fullMatch, filename, alt] = match;
        const start = match.index;

        if (start > lastIndex) {
          children.push({ type: 'text', value: value.slice(lastIndex, start) });
        }

        const imageNode: Image = {
          type: 'image',
          url: `${base}/assets/${filename}`,
          alt: alt ?? filenameToAlt(filename),
          title: null,
          data: { hProperties: { loading: 'lazy' } },
        };

        children.push(imageNode);

        lastIndex = start + fullMatch.length;
      }

      if (hasMatch) {
        if (lastIndex < value.length) {
          children.push({ type: 'text', value: value.slice(lastIndex) });
        }
        parent.children.splice(index, 1, ...children);
      }
    });
  };
};

export default remarkWikiImages;
