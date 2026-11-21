'use client';
import { useRef } from 'react';
import { Play, Plus } from 'lucide-react';
import { usePlayback, type Track } from '@/context/PlaybackContext';
import { useVirtualWindow } from '@/hooks/useVirtualWindow';
import { isTrackAvailable, UNAVAILABLE_REASON } from '@/lib/tracks';

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return '—';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

/**
 * PERF-06: above this many rows the list is windowed instead of fully rendered.
 *
 * Below it, virtualising costs more than it saves: the machinery (a scroll
 * listener, spacers, a ref) would run for a list that already fits on screen.
 * An album is usually under the threshold; a playlist or a search result is
 * not, and those are the lists that stuttered.
 */
const VIRTUALIZE_THRESHOLD = 50;

/** Every row has the same height, which is what makes the offset arithmetic exact. */
const ROW_HEIGHT = 72;

export default function TrackList({ tracks }: { tracks: Track[] }) {
  const { playTrack, addToQueue } = usePlayback();
  const listRef = useRef<HTMLOListElement | null>(null);

  const virtualize = tracks.length > VIRTUALIZE_THRESHOLD;
  const window_ = useVirtualWindow({
    itemCount: tracks.length,
    itemHeight: ROW_HEIGHT,
    containerRef: listRef,
    enabled: virtualize,
  });

  const visible = virtualize ? tracks.slice(window_.startIndex, window_.endIndex) : tracks;

  return (
    <ol
      ref={listRef}
      aria-label="Tracks"
      // Rows carry `h-[72px]` so the virtual window's arithmetic matches the
      // layout. Only a virtualized list needs the bounded, scrollable box.
      className={`divide-y divide-border-dark ${virtualize ? 'max-h-[70vh] overflow-y-auto' : ''}`}
    >
      {virtualize && window_.topSpacer > 0 && (
        <li aria-hidden="true" className="list-none" style={{ height: window_.topSpacer }} />
      )}
      {visible.map((track, offset) => {
        const index = virtualize ? window_.startIndex + offset : offset;
        const available = isTrackAvailable(track);
        return (
          <li
            key={`${track.id}-${index}`}
            className={`flex h-[72px] items-center gap-3 py-3 ${available ? '' : 'text-on-muted'}`}
          >
            <span className="w-6 shrink-0 text-sm text-on-muted">{index + 1}</span>
            <button
              aria-label={`Play ${track.title}`}
              className="rounded-full p-2 disabled:opacity-40"
              disabled={!available}
              type="button"
              onClick={() => playTrack(track)}
            >
              <Play aria-hidden="true" size={18} />
            </button>
            <div className={`min-w-0 flex-1 ${available ? '' : 'opacity-60'}`}>
              <p className="truncate font-medium">{track.title}</p>
              <p className="truncate text-sm text-on-muted">{track.artist}</p>
              {!available && (
                <span
                  aria-describedby={`unavailable-${index}`}
                  className="text-sm"
                  tabIndex={0}
                  title={UNAVAILABLE_REASON}
                >
                  Unavailable
                  <span className="sr-only" id={`unavailable-${index}`}>
                    : {UNAVAILABLE_REASON}
                  </span>
                </span>
              )}
            </div>
            <span className="text-sm text-on-muted">{formatDuration(track.duration)}</span>
            <button
              aria-label={`Queue ${track.title}`}
              className="rounded p-2 disabled:opacity-40"
              disabled={!available}
              type="button"
              onClick={() => addToQueue(track)}
            >
              <Plus aria-hidden="true" size={18} />
            </button>
          </li>
        );
      })}
      {virtualize && window_.bottomSpacer > 0 && (
        <li aria-hidden="true" className="list-none" style={{ height: window_.bottomSpacer }} />
      )}
    </ol>
  );
}
