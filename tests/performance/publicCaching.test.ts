import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// PERF-05's rule, as a build failure: the public shell may be cached, a
// dashboard route may not. The second half matters more than the first — a
// cached dashboard would show one artist another's data.

const root = process.cwd();
const read = (relative: string) => readFileSync(join(root, relative), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

describe('PERF-05: ISR on public routes', () => {
  it('revalidates the landing page and the marketplace every five minutes', () => {
    expect(read('app/(home)/page.tsx')).toContain('export const revalidate = 300');
    expect(read('app/(home)/marketPlace/page.tsx')).toContain('export const revalidate = 300');
  });

  it('never revalidates a dashboard route', () => {
    const dashboard = join(root, 'app', 'dashboard');
    if (!existsSync(dashboard)) return;

    for (const file of walk(dashboard)) {
      if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
      expect(
        readFileSync(file, 'utf8'),
        `${file} must not be cached: it renders one artist's data`
      ).not.toMatch(/export const revalidate/);
    }
  });

  it('documents the strategy', () => {
    const doc = read('docs/ISR.md');
    expect(doc).toContain('revalidate = 300');
    expect(doc).toContain('Never add `revalidate` to `app/dashboard/**`');
  });
});
