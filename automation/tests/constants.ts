export const API_URL = 'http://localhost:3000';
export const APP_URL = 'http://localhost:5173';

/**
 * Case IDs are stable across backend restarts because the seed data is
 * generated deterministically (SEED=42 in backend/src/data/seed.ts).
 * Each stateful test below claims its own dedicated case ID so tests can
 * run in any order, or in parallel, without interfering with each other —
 * there is no test-data reset endpoint, so this is the only isolation
 * mechanism available (see automation/README.md).
 */
export const KNOWN_CASES = {
  happyPathCase: 'case-14', // "Operation Pale Horizon" — 1 phone, 1 email, 1 social
  timingEdgeCase: 'case-24', // "Operation Blue Falcon" — has phones + socials
  doubleSubmitCase: 'case-6', // "Operation Slate River" — 1 phone, 1 social
  sortingCase: 'case-10', // "Operation Crimson Tide" — 2 phones, 1 email
  rawJsonCase: 'case-3', // "Operation Nightshade" — 2 social profiles
  emptyCase: 'case-28', // "Operation Violet Static" — 0 items of any kind
  missingFromPagination: 'case-19', // "Operation Quiet Harbor" — dropped by the pagination bug (ref #1)
};
