# Bulk Re-run Enrichment: Test Plan

Part 3: planning notes for a proposed feature, written from a one-paragraph spec with no further detail.

*Optional: a styled version of this same plan is viewable live at [reutweibel.github.io/signal-monitor-qa/extras/test-plan.html](https://reutweibel.github.io/signal-monitor-qa/extras/test-plan.html).*

## The full spec, as given

> "We're planning to add a 'bulk re-run enrichment' action: a checkbox on the case list to select multiple cases, plus a button that re-runs enrichment for all of them at once. That's the entire spec we have right now."

## Assumptions

Stated explicitly so the plan stays scoped to this feature rather than re-litigating Part 1.

- **Bugs #2 and #3** (from `bug-report.md`) are assumed already fixed: enrichment on an empty case no longer crashes, and the existing single-case "Run Enrichment" button no longer allows duplicate concurrent jobs. These are unrelated defects that happen to exist in the same codebase, not something this feature needs to account for.
- **Bug #1** (pagination drops a case) is *not* assumed away, and is instead treated separately below, since "select all" would be built directly on top of the same paginated list and could inherit that exact defect by construction rather than coincidence.

## Questions for the product owner

Asked before writing a single test case, since the answers change what "correct" even means for several scenarios below.

1. Does "re-run" mean the action only applies to cases that already have prior enrichment history, or does it also cover a case being enriched for the first time?
2. Does a "select all" mechanism exist at all (e.g. a header checkbox above the list), or is there no such shortcut and every case must be selected individually?
3. If "select all" exists: how does it appear (e.g. a master checkbox above the row-level checkboxes)? And does it mean every case on the current page, or every case matching the current filter across all pages?
4. Is fixing bug #1 (pagination silently drops a case) a prerequisite for shipping "select all," or does "select all" need its own implementation that doesn't rely on the current paginated list?
5. Is there a cap on how many cases can be selected and bulk-run at once?
6. Can `closed` cases be included in a bulk selection, or should they be excluded or disabled?
7. Does the bulk-run button only appear once one or more cases are selected, or is it always visible and simply disabled at zero selection?

## Test plan, in order

Foundational checks first, core value next, then boundaries and stress, then interaction with existing features, then failure handling, then persistence, and the genuinely ambiguous scenarios last, since there's no point testing what "correct" means before knowing what correct means.

### Stage 0: Precondition
- Case list renders with a populated set of cases and a checkbox visible next to each row

### Stage 1: Selection mechanics
*Before the run button is ever touched, prove the selection UI itself works.*
- Select a single case via its checkbox
- Select multiple cases
- Deselect a previously selected case
- If a "select all" control exists (Q2): select all, then deselect all
- Bulk-run button state tracks the current selection consistently, whichever pattern was chosen (Q7)

### Stage 2: Happy path
*The core value of the feature, proven once before anything else is layered on.*
- Select 2-3 cases, click bulk-run, verify every selected case gets exactly one new enrichment result and no unselected case is touched
- Confirm what progress feedback is shown during the run: one aggregate indicator, or per-case status

### Stage 3: Boundaries
- Select exactly 1 case and bulk-run: confirm it behaves equivalently to the existing single-case run, not a divergent code path
- Select the maximum available cases and bulk-run
- Attempt bulk-run with 0 cases selected: confirm it's prevented or clearly rejected, not a silent no-op

### Stage 4: Re-entrancy on the bulk button itself
*A new code path deserves its own check, independent of whether the old single-case bug (#3) is fixed.*
- Click bulk-run, then click it again before the batch completes: does every case in the batch get duplicated, or was this one built with a guard?

### Stage 5: Interaction with the existing single-case flow
- A case that's individually running enrichment via the existing per-case button is also included in a bulk selection: override, duplicate, or deferred?
- A case is deselected after bulk-run has started but before it completes: does that affect anything, or is the batch already locked in at click time?

### Stage 6: Partial failure within a batch
- One case in a multi-case batch fails mid-run: does the rest of the batch continue, or does the whole batch abort?

### Stage 7: Selection persistence
- Select cases, then change the search or status filter: does the selection survive?
- Select cases on one page, then click "Next" with no filter change: does the selection survive across pages?

### Stage 8: Ambiguous scenarios *(needs PO input)*
*Tested last on purpose: expected behavior is undefined until the questions above are answered. Each item is designed to record actual behavior now, so the observation is ready the moment the question is answered, rather than asserting a guessed outcome.*
- Select-all's interaction with bug #1: is the case missing from the paginated view (case-19) also silently excluded from the bulk operation? *(observe only)*
- A selection mixing `open` and `closed` cases *(observe only)*
- A selection mixing cases with and without prior enrichment history *(observe only)*
