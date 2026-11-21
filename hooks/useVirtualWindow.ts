'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Fixed-row windowing for long lists (PERF-06).
 *
 * The dashboard lists that can grow past a screenful — a playlist, an album's
 * tracks, a search's results — render one row per item today. At a few hundred
 * rows that is a few hundred DOM nodes the browser lays out on every state
 * change, and a scroll that visibly stutters.
 *
 * This hook renders only the rows in view plus an overscan margin, and pads
 * the list with two spacers so the scrollbar keeps its real size. It is
 * deliberately not a dependency: the arithmetic is small, and a virtualiser
 * that can be unit-tested without a DOM is easier to trust than a library
 * setting.
 *
 * Fixed row height is a real constraint, not an implementation detail: a row
 * that grows (a wrapped title, an expanded row) breaks the offset arithmetic.
 * `computeWindow` is pure so the invariant is testable.
 */

export interface WindowInput {
  /** Index of the first visible row, measured from the top of the list. */
  scrollTop: number;
  /** Height of the scroll container's viewport. */
  viewportHeight: number;
  itemCount: number;
  itemHeight: number;
  /** Rows rendered above and below the viewport to keep fast scrolling smooth. */
  overscan?: number;
}

export interface WindowRange {
  startIndex: number;
  /** Exclusive. */
  endIndex: number;
  /** Height of the spacer before the first rendered row. */
  topSpacer: number;
  /** Height of the spacer after the last rendered row. */
  bottomSpacer: number;
  totalHeight: number;
}

/**
 * The rows to render for a scroll offset.
 *
 * Clamps at both ends: scrolling past the list, or a viewport taller than the
 * content, yields a valid range rather than a negative index.
 */
export function computeWindow({
  scrollTop,
  viewportHeight,
  itemCount,
  itemHeight,
  overscan = 4,
}: WindowInput): WindowRange {
  const totalHeight = Math.max(0, itemCount * itemHeight);
  if (itemCount <= 0 || itemHeight <= 0) {
    return { startIndex: 0, endIndex: 0, topSpacer: 0, bottomSpacer: 0, totalHeight: 0 };
  }

  const safeScroll = Math.min(Math.max(0, scrollTop), Math.max(0, totalHeight - 1));
  const firstVisible = Math.floor(safeScroll / itemHeight);
  const visibleCount = Math.max(1, Math.ceil(Math.max(0, viewportHeight) / itemHeight));

  const startIndex = Math.max(0, firstVisible - overscan);
  const endIndex = Math.min(itemCount, firstVisible + visibleCount + overscan);

  return {
    startIndex,
    endIndex,
    topSpacer: startIndex * itemHeight,
    bottomSpacer: (itemCount - endIndex) * itemHeight,
    totalHeight,
  };
}

export interface UseVirtualWindowOptions {
  itemCount: number;
  itemHeight: number;
  containerRef: RefObject<HTMLElement | null>;
  overscan?: number;
  /** Set false to render every row: short lists do not need the machinery. */
  enabled?: boolean;
}

/**
 * Tracks the scroll position of `containerRef` and returns the current window.
 *
 * The listener is passive and the state only changes when the range changes,
 * so scrolling does not re-render a row list on every pixel.
 */
export function useVirtualWindow({
  itemCount,
  itemHeight,
  containerRef,
  overscan = 4,
  enabled = true,
}: UseVirtualWindowOptions): WindowRange {
  const [range, setRange] = useState<WindowRange>(() => ({
    startIndex: 0,
    endIndex: enabled
      ? Math.min(itemCount, overscan * 2 + Math.ceil(600 / Math.max(itemHeight, 1)))
      : itemCount,
    topSpacer: 0,
    bottomSpacer: 0,
    totalHeight: itemCount * itemHeight,
  }));

  useEffect(() => {
    if (!enabled) {
      setRange({
        startIndex: 0,
        endIndex: itemCount,
        topSpacer: 0,
        bottomSpacer: 0,
        totalHeight: itemCount * itemHeight,
      });
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const next = computeWindow({
        scrollTop: element.scrollTop,
        viewportHeight: element.clientHeight,
        itemCount,
        itemHeight,
        overscan,
      });
      setRange((previous) =>
        previous.startIndex === next.startIndex &&
        previous.endIndex === next.endIndex &&
        previous.totalHeight === next.totalHeight
          ? previous
          : next
      );
    };

    update();
    element.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      element.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [containerRef, enabled, itemCount, itemHeight, overscan]);

  return range;
}
