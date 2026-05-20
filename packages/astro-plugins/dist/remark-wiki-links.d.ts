import type { Plugin } from 'unified';
import type { Root } from 'mdast';
interface Options {
    publishedSlugs: Set<string>;
    base?: string;
}
declare const remarkWikiLinks: Plugin<[Options], Root>;
export default remarkWikiLinks;
//# sourceMappingURL=remark-wiki-links.d.ts.map