export function slugify(input) {
    return input
        .split('/')
        .map(segment => segment
        .replace(/^\d+\s*-\s*/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''))
        .filter(Boolean)
        .join('/');
}
//# sourceMappingURL=slugify.js.map