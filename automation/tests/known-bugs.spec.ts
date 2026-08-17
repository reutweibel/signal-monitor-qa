import { test, expect } from '@playwright/test';
import { API_URL, APP_URL, KNOWN_CASES } from './constants';

/**
 * Each test here encodes one defect from bug-report.md, written to assert
 * the CORRECT expected behavior and annotated with test.fail(). While the
 * bug is unfixed, Playwright reports these as "expected failures" (not a
 * red build); the moment a fix lands, the test flips to an unexpected pass
 * and Playwright flags it, the cue to delete the test.fail() line and let
 * the test stand as a normal regression guard going forward.
 *
 * Ref #7 (cosmetic codename inconsistency) is intentionally not automated:
 * it's static copy with no behavior to assert, so a test for it would just
 * hardcode today's seed output rather than verify anything meaningful.
 */

test.describe('Known bug regressions (see bug-report.md)', () => {
  test('Ref #1: pagination should not drop cases from the list', async ({ request }) => {
    test.fail();

    const page1 = await (await request.get(`${API_URL}/cases?limit=5&page=1`)).json();
    const page2 = await (await request.get(`${API_URL}/cases?limit=5&page=2`)).json();

    const seenIds = new Set([...page1.data, ...page2.data].map((c: { id: string }) => c.id));
    expect(seenIds.size, 'distinct cases seen across all pages should equal the reported total').toBe(
      page1.total,
    );
    expect(seenIds.has(KNOWN_CASES.missingFromPagination)).toBe(true);
  });

  test('Ref #2: running enrichment on a case with no items should not crash the server', async ({ request }) => {
    test.fail();

    const res = await request.post(`${API_URL}/cases/${KNOWN_CASES.emptyCase}/enrich`);
    expect(res.status(), 'should not be a 500 for a case that legitimately has zero items').toBeLessThan(500);
  });

  test('Ref #3: re-clicking Run Enrichment while a job is in flight should not create duplicate results', async ({
    request,
  }) => {
    test.fail();
    const caseId = KNOWN_CASES.doubleSubmitCase;

    const [r1, r2] = await Promise.all([
      request.post(`${API_URL}/cases/${caseId}/enrich`),
      request.post(`${API_URL}/cases/${caseId}/enrich`),
    ]);
    const { jobId: job1 } = await r1.json();
    const { jobId: job2 } = await r2.json();

    await expect(async () => {
      const j1 = await (await request.get(`${API_URL}/enrichment-jobs/${job1}`)).json();
      const j2 = await (await request.get(`${API_URL}/enrichment-jobs/${job2}`)).json();
      expect(j1.status).toBe('completed');
      expect(j2.status).toBe('completed');
    }).toPass({ timeout: 10_000, intervals: [300] });

    const caseData = await (await request.get(`${API_URL}/cases/${caseId}`)).json();
    const allItems = [...caseData.phoneNumbers, ...caseData.socialProfiles];
    expect(allItems.length).toBeGreaterThan(0);
    for (const item of allItems) {
      expect(item.enrichments.length, `item ${item.id} ran once, so should have exactly 1 result`).toBe(1);
    }
  });

  test('Ref #4: enrichment results should be sorted by confidence score numerically, not lexically', async ({
    page,
    request,
  }) => {
    test.fail();
    const caseId = KNOWN_CASES.sortingCase;

    // confidenceScore is Math.floor(Math.random() * 101): only 10 of the 101
    // possible values (0-9) are single-digit, so the lexical-sort bug only
    // becomes visible when a single-digit score lands among two-digit ones.
    // A handful of samples isn't reliable, so fire many concurrent enrichment
    // runs (this also exercises bug #3, harmlessly, as a way to generate
    // volume quickly) so each item accumulates ~20 samples in one batch
    // instead of running sequentially. This makes a violation highly likely
    // without a slow test; it does not make it certain, see README.
    const RUNS = 20;
    const jobIds: string[] = [];
    await Promise.all(
      Array.from({ length: RUNS }, async () => {
        const res = await request.post(`${API_URL}/cases/${caseId}/enrich`);
        const { jobId } = await res.json();
        jobIds.push(jobId);
      }),
    );

    await expect(async () => {
      const jobs = await Promise.all(
        jobIds.map((id) => request.get(`${API_URL}/enrichment-jobs/${id}`).then((r) => r.json())),
      );
      for (const job of jobs) expect(job.status).toBe('completed');
    }).toPass({ timeout: 20_000, intervals: [500] });

    await page.goto(`${APP_URL}/cases/${caseId}`);

    const itemCards = page.locator('.item-card');
    const cardCount = await itemCards.count();
    expect(cardCount).toBeGreaterThan(0);

    for (let i = 0; i < cardCount; i++) {
      const texts = await itemCards.nth(i).locator('.enrichment-row .confidence').allTextContents();
      const scores = texts.map((t) => Number(t.replace(/^confidence\s+/, '')));
      const numericDescending = [...scores].sort((a, b) => b - a);
      expect(scores, `item ${i} confidence order should be numeric-descending`).toEqual(numericDescending);
    }
  });

  test('Ref #5: enrichment results should be human-readable, not raw JSON', async ({ page, request }) => {
    test.fail();
    const caseId = KNOWN_CASES.rawJsonCase;

    const { jobId } = await (await request.post(`${API_URL}/cases/${caseId}/enrich`)).json();
    await expect(async () => {
      const job = await (await request.get(`${API_URL}/enrichment-jobs/${jobId}`)).json();
      expect(job.status).toBe('completed');
    }).toPass({ timeout: 10_000, intervals: [300] });

    await page.goto(`${APP_URL}/cases/${caseId}`);
    const resultText = await page.locator('.enrichment-row .result').first().textContent();
    expect(resultText?.trim().startsWith('{'), 'result text should not look like raw JSON').toBe(false);
  });

  test('Ref #6a: GET /cases?page=0 should not silently return unrelated data', async ({ request }) => {
    test.fail();
    const res = await (await request.get(`${API_URL}/cases?page=0&limit=5`)).json();
    expect(res.data.length, 'page 0 is not a valid page and should return no data, not arbitrary cases').toBe(0);
  });

  test('Ref #6b: GET /cases?status=bogus should reject the invalid filter value', async ({ request }) => {
    test.fail();
    const res = await request.get(`${API_URL}/cases?status=bogus`);
    expect(res.status()).toBe(400);
  });
});
