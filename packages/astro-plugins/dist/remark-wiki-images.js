import { visit } from 'unist-util-visit';
function filenameToAlt(filename) {
    return filename
        .replace(/\.[^.]+$/, '')
        .replace(/[_-]/g, ' ')
        .trim();
}
const remarkWikiImages = (options = {}) => {
    const base = options.base ?? '';
    return (tree) => {
        visit(tree, 'text', (node, index, parent) => {
            if (index === undefined || !parent)
                return;
            const value = node.value;
            const imageRegex = /!\[\[(.*?)(?:\|(.*?))?\]\]/g;
            const children = [];
            let lastIndex = 0;
            let match;
            let hasMatch = false;
            while ((match = imageRegex.exec(value)) !== null) {
                hasMatch = true;
                const [fullMatch, filename, alt] = match;
                const start = match.index;
                if (start > lastIndex) {
                    children.push({ type: 'text', value: value.slice(lastIndex, start) });
                }
                const imageNode = {
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
//# sourceMappingURL=remark-wiki-images.js.map