# ADR 0002: Keep `react-slick` for the carousels, for now

**Status:** Accepted
**Context item:** `PERF-07`

## Context

`react-slick` and its stylesheet (`slick-carousel`) are used by the dashboard
carousels and a few home sections. `BUNDLE_SIZE_AUDIT.md` estimates the pair at
**~30 KB** and lists replacing them as a follow-up. The launch-readiness list
asks for a decision rather than an open question, because "replace the
carousel" is the kind of item that gets scheduled forever.

What the carousels actually use: horizontal paging, arrow controls, an
auto-play timer on the hero, and responsive `slidesToShow`. They do not use the
library's lazy loading, variable widths, vertical mode, RTL swiping or the
`asNavFor` linkage.

## Decision

**Keep `react-slick`.** Do not migrate before launch.

The measurement does not support a rewrite yet:

- 30 KB is roughly 7% of the 450 KB script budget in `.lighthouserc.js`. It is
  not the 350 KB the wallet providers cost, and `PERF-03`'s lazy wallet loading
  is where the win is.
- The component is loaded on dashboard routes, not on the public pages the
  Lighthouse budget measures first. A visitor landing on `/` never downloads
  it.
- A CSS scroll-snap replacement is a small amount of code but a large amount of
  behaviour to re-verify: keyboard focus, `aria-live` announcements, the
  auto-play pause-on-hover rule, and the reduced-motion path. That is a feature
  change disguised as a dependency cleanup, and it does not belong in a
  launch-readiness branch.

## Consequences

- The ~30 KB stays in the dashboard bundle. It is inside budget.
- A carousel rewrite is now a normal product change with a measurable goal:
  remove the dependency and land the same interactions, with the visual
  regression suite as the guard.
- If the carousels are redesigned for another reason, scroll-snap is the
  default choice: no dependency, and the same interaction contract can be
  covered by the existing Playwright baselines.

## Revisit when

- The dashboard bundle approaches the 450 KB script budget after the wallet
  split.
- A carousel is redesigned anyway — then the replacement is part of that work,
  not a separate project.
- `react-slick` misses a React release the app needs. It has been slow to
  support React 19 features; a forced upgrade is the natural trigger.

## Evidence

- `BUNDLE_SIZE_AUDIT.md` — the size estimate and the existing follow-up note
- `.lighthouserc.js` — the script budget this decision is measured against
- `grep -rl "react-slick" components app` — the seven components involved
