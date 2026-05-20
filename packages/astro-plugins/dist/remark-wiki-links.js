import { visit } from 'unist-util-visit';
import { slugify } from './slugify.js';
const WIKI_LINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
const remarkWikiLinks = (options) => {
    const { publishedSlugs, base = '' } = options;
    // Build a suffix-to-full-slug lookup so that wikilinks without a folder
    // prefix (e.g. [[O que é PARA]]) can resolve to their full path
    // (e.g. recursos/o-que-e-para) when the publishedSlugs set stores full paths.
    const suffixMap = new Map();
    for (const fullSlug of publishedSlugs) {
        const parts = fullSlug.split('/');
        const suffix = parts[parts.length - 1];
        // Store both the full slug and the final segment for lookup
        suffixMap.set(fullSlug, fullSlug);
        suffixMap.set(suffix, fullSlug);
    }
    return (tree) => {
        visit(tree, 'text', (node, index, parent) => {
            if (index === undefined || !parent)
                return;
            const text = node.value;
            WIKI_LINK.lastIndex = 0;
            const children = [];
            let lastIndex = 0;
            let match;
            let hasMatch = false;
            while ((match = WIKI_LINK.exec(text)) !== null) {
                hasMatch = true;
                const [fullMatch, title, alias] = match;
                const displayText = (alias ?? title).trim();
                const slug = slugify(title.trim());
                if (match.index > lastIndex) {
                    children.push({ type: 'text', value: text.slice(lastIndex, match.index) });
                }
                const resolvedSlug = suffixMap.get(slug);
                if (resolvedSlug !== undefined) {
                    const link = {
                        type: 'link',
                        url: `${base}/${resolvedSlug}`,
                        children: [{ type: 'text', value: displayText }],
                    };
                    children.push(link);
                }
                else {
                    children.push({ type: 'text', value: displayText });
                }
                lastIndex = match.index + fullMatch.length;
            }
            if (!hasMatch)
                return;
            if (lastIndex < text.length) {
                children.push({ type: 'text', value: text.slice(lastIndex) });
            }
            parent.children.splice(index, 1, ...children);
        });
    };
};
export default remarkWikiLinks;
//# sourceMappingURL=remark-wiki-links.js.map