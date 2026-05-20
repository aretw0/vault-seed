export function slugify(input: string): string {
  return input
    .split('/')
    .map(segment =>
      segment
        .replace(/^\d+\s*-\s*/, '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')   // Combining Diacritical Marks
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    )
    .filter(Boolean)
    .join('/');
}
