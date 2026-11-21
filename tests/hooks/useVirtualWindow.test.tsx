import { describe, expect, it } from 'vitest';

import { computeWindow } from '@/hooks/useVirtualWindow';

// PERF-06's arithmetic. The hook's listener is thin; what needs pinning is the
// range it computes, because an off-by-one here either hides a row or renders
// a row twice.

describe('computeWindow', () => {
  const base = { itemCount: 1000, itemHeight: 72, viewportHeight: 720 };

  it('renders a viewport plus overscan at the top', () => {
    const range = computeWindow({ ...base, scrollTop: 0, overscan: 4 });
    expect(range.startIndex).toBe(0);
    // 720 / 72 = 10 visible rows, plus 4 overscan below.
    expect(range.endIndex).toBe(14);
    expect(range.topSpacer).toBe(0);
    expect(range.bottomSpacer).toBe((1000 - 14) * 72);
    expect(range.totalHeight).toBe(1000 * 72);
  });

  it('moves the window with the scroll offset and keeps the spacers exact', () => {
    const range = computeWindow({ ...base, scrollTop: 7200, overscan: 2 });
    // 7200 / 72 = row 100 at the top.
    expect(range.startIndex).toBe(98);
    expect(range.endIndex).toBe(112);
    expect(range.topSpacer).toBe(98 * 72);
    expect(range.topSpacer + (range.endIndex - range.startIndex) * 72 + range.bottomSpacer).toBe(
      range.totalHeight
    );
  });

  it('never scrolls past the last row', () => {
    const range = computeWindow({ ...base, scrollTop: 10_000_000, overscan: 4 });
    expect(range.endIndex).toBe(1000);
    expect(range.bottomSpacer).toBe(0);
    expect(range.startIndex).toBeLessThan(1000);
  });

  it('clamps a negative scroll offset', () => {
    const range = computeWindow({ ...base, scrollTop: -500, overscan: 0 });
    expect(range.startIndex).toBe(0);
  });

  it('handles a viewport taller than the whole list', () => {
    const range = computeWindow({
      itemCount: 3,
      itemHeight: 72,
      viewportHeight: 2000,
      scrollTop: 0,
    });
    expect(range.startIndex).toBe(0);
    expect(range.endIndex).toBe(3);
    expect(range.bottomSpacer).toBe(0);
  });

  it('returns an empty range for an empty list or a zero row height', () => {
    expect(computeWindow({ ...base, itemCount: 0, scrollTop: 0 })).toEqual({
      startIndex: 0,
      endIndex: 0,
      topSpacer: 0,
      bottomSpacer: 0,
      totalHeight: 0,
    });
    expect(computeWindow({ ...base, itemHeight: 0, scrollTop: 0 }).endIndex).toBe(0);
  });

  it('always renders at least one row, even in a zero-height viewport', () => {
    const range = computeWindow({ ...base, viewportHeight: 0, scrollTop: 0, overscan: 0 });
    expect(range.endIndex - range.startIndex).toBeGreaterThanOrEqual(1);
  });
});
