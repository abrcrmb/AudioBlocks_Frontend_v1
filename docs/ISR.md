# Caching the public pages (ISR)

Launch-readiness item `PERF-05`.

## What is configured

Two public routes export `revalidate = 300`:

| Route          | File                              | Revalidated |
| :------------- | :-------------------------------- | :---------- |
| `/`            | `app/(home)/page.tsx`             | every 300 s |
| `/marketPlace` | `app/(home)/marketPlace/page.tsx` | every 300 s |

Next serves the cached HTML immediately and regenerates it in the background
once the window expires — stale-while-revalidate, not a blocking rebuild. The
first request after a deploy warms each route.

## What this actually caches, and what it does not

Both pages are server components whose interactive parts are client
components. The listings, recently-played shelves and wallet state are fetched
in the browser after hydration. So this caches **the HTML shell** — layout,
metadata, above-the-fold markup — and not **the catalogue**.

That is still the bulk of the win for a signed-out visitor: the document
arrives from the edge instead of being rendered per request. It is also why
the window is 300 s rather than an hour: the shell changes when a deploy
changes it, and five minutes bounds how long a stale shell can survive a
release without making the cache useless.

## Why not cache the data too

The catalogue is per-listener (recommendations, held NFTs, playback history)
and changes with each upload. Caching it in the Next data cache would mean
either serving one listener's rows to another or invalidating on every upload —
the problem React Query already solves in the browser with keys and
invalidation.

## Rules for a new public route

- A route that renders the same thing for every visitor may export
  `revalidate`. Prefer 300, and justify anything longer in the pull request.
- A route that reads `cookies()`, `headers()` or a search param on the server
  is dynamic; adding `revalidate` there is a no-op at best and misleading at
  worst.
- Never add `revalidate` to `app/dashboard/**`: those pages are per-artist, and
  a cached shell that renders another artist's session is a security bug, not a
  performance one.

## Verifying

`tests/performance/publicCaching.test.ts` asserts both routes export
`revalidate = 300` and that no dashboard page does. The production check is the
response header: a cached route answers with `x-nextjs-cache: HIT` after the
first request.
