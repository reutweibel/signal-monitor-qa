# Signal Monitor — Automated Test Suite (Part 2)

Playwright test suite covering the core flows of Signal Monitor, plus a regression suite that encodes the 7 defects from [`../bug-report.md`](../bug-report.md).

## Setup

```bash
npm install
npx playwright install chromium
```

## Running

**The app under test is a separate project and is not started automatically** — this suite doesn't assume it lives at any particular path on your machine. Start it first, per its own README:

```bash
# in the app's backend/ folder
npm run start:dev
# in a second terminal, in the app's frontend/ folder
npm run dev
```

Then, from this folder:

```bash
npx playwright test          # run everything, headless
npx playwright test --headed # watch it run in a browser
npm run report                # open the last HTML report
```

## Test organization

| File | Covers |
|---|---|
| `tests/happy-path.spec.ts` | Core flow: run enrichment on a populated case, poll to completion, verify every item gains exactly one new result |
| `tests/edge-timing.spec.ts` | Timing-sensitive edge case: job must not report "completed" instantly, and must complete within a bounded upper limit |
| `tests/negative.spec.ts` | Negative/error-handling: requests against nonexistent cases/jobs return clean 404s |
| `tests/known-bugs.spec.ts` | Regression suite for the 7 bugs in `bug-report.md` (see below) |

## The regression suite and `test.fail()`

Each test in `known-bugs.spec.ts` asserts the **correct** expected behavior (not the current buggy behavior) and is annotated with `test.fail()`. While a bug is unfixed:

- The test fails, but Playwright reports it as an *expected* failure — it doesn't turn the build red.
- If a fix lands and the test starts passing, Playwright reports it as an **unexpected pass** and flags it — that's the signal to delete the `test.fail()` line, at which point the test becomes a normal regression guard against that bug ever coming back.

This means the suite is safe to run in CI today, on an app that's known to have unfixed bugs, without masking real signal.

**Ref #7** (cosmetic codename inconsistency) is intentionally not automated — it's static copy with no behavior to assert; a test for it would just hardcode today's seed output rather than verify anything.

## Test isolation

There is no test-data reset endpoint, and the backend holds all case/enrichment state in memory for its whole process lifetime (only a full restart resets it, per the app's own README). To keep tests independent of each other and of execution order without that reset:

- **Stateful tests each claim a dedicated case ID** (see `tests/constants.ts`) — no two tests read or write the same case, so they're safe to run in parallel or in any order within a single backend lifetime.
- Where a test does mutate its case, it compares **before/after snapshots** rather than assuming a case starts empty, so it stays correct even if run twice in a row without restarting the backend.

Case IDs are stable across restarts because the seed is deterministic (`SEED = 42` in the app's `backend/src/data/seed.ts`), which is what makes hardcoding specific case IDs here safe rather than fragile.

## Known limitation: `Ref #4` (sorting) is not fully deterministic

`confidenceScore` is a random integer 0-100, and only 10 of those 101 values are single-digit — the lexical-sort bug is only visible when a single-digit score lands next to a two-digit one. The test fires 20 concurrent enrichment runs per case to build up enough samples that a violation is highly likely (empirically consistent across repeated runs), but it is a probabilistic test, not a deterministic one: given the app exposes no way to control or seed individual confidence scores through its API, there's no fully deterministic way to trigger this specific bug from outside the app's own process. If this test is ever seen to pass unexpectedly, that's more likely bad luck than the bug being fixed — worth a second run before concluding anything.
