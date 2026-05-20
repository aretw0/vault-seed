import type { Plugin } from 'unified';
import type { Root } from 'mdast';
interface CalloutTypeConfig {
    color?: string;
}
interface CalloutOptions {
    types?: Record<string, CalloutTypeConfig>;
}
declare const remarkCallouts: Plugin<[CalloutOptions?], Root>;
export default remarkCallouts;
//# sourceMappingURL=remark-callouts.d.ts.map