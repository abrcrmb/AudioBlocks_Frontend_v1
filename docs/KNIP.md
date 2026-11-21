# Unused files, exports and dependencies (knip)

Launch-readiness item `PERF-08`.

## What runs

`.github/workflows/knip.yml`, on every pull request and on demand:
`npx knip@5 --reporter json` through `knip.json`, then a summary table on the
run page and the full JSON as an artifact kept for 30 days.

`--no-exit-code` is deliberate for now: the job reports, it does not fail.

## What knip looks at

| Category          | What a hit means                                                                                           |
| :---------------- | :--------------------------------------------------------------------------------------------------------- |
| `files`           | A source file nothing imports, tests or routes to.                                                         |
| `dependencies`    | A package in `dependencies` that no imported module uses.                                                  |
| `devDependencies` | The same for build/test tooling; config-only tools are allow-listed in `knip.json`.                        |
| `unlisted`        | An import of a package that is not declared — a build that only works because something else pulled it in. |
| `exports`         | An exported symbol nothing imports.                                                                        |
| `types`           | An exported type nothing imports.                                                                          |

`entry` in `knip.json` lists the Next.js conventions (`page`, `layout`,
`route`, …), the test and story globs, and the config files. Without those,
every route file would look unused.

## Reading a report

Start with `dependencies` and `unlisted` — those change what users download.
`exports` is usually the largest list and the least urgent: an unused export
costs nothing at runtime once the file is imported for something else, but it
is dead weight for the next reader.

Do not delete a package because knip says so without checking the build: a
package used only through a Next.js plugin, a PostCSS preset or a CLI in a
workflow script is invisible to static analysis. Add it to `ignoreDependencies`
with a one-line reason in the pull request instead of leaving the report noisy.

## When this becomes a gate

The job flips to failing when two consecutive runs report zero `unlisted` and
zero `dependencies`, and the `exports` count has been reduced by the cleanup
issues filed from the first report. Until then a red build here would only
teach contributors to ignore it.

## Local run

```sh
npx knip@5
```

Add `--reporter json` for the machine-readable form the workflow uploads.
