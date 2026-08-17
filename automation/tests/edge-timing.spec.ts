import { test, expect } from '@playwright/test';
import { API_URL, KNOWN_CASES } from './constants';

test.describe('Edge case: enrichment job timing', () => {
  test('job is still running immediately after starting, and completes within the expected upper bound', async ({
    request,
  }) => {
    const caseId = KNOWN_CASES.timingEdgeCase;

    const startRes = await request.post(`${API_URL}/cases/${caseId}/enrich`);
    expect(startRes.ok()).toBeTruthy();
    const { jobId } = await startRes.json();

    // Each of the 3 simulated sources has a minimum delay of ~2s
    // (backend/src/enrichment/enrichment.service.ts MIN_DELAY_MS), so the
    // job must not already be "completed" the instant it's created.
    const immediate = await (await request.get(`${API_URL}/enrichment-jobs/${jobId}`)).json();
    expect(immediate.status).toBe('running');

    // Max simulated delay is ~6s per source; allow generous slack above
    // that for CI/local variance without letting the test hang forever.
    await expect(async () => {
      const job = await (await request.get(`${API_URL}/enrichment-jobs/${jobId}`)).json();
      expect(job.status).toBe('completed');
    }).toPass({ timeout: 10_000, intervals: [300] });

    const final = await (await request.get(`${API_URL}/enrichment-jobs/${jobId}`)).json();
    expect(final.sources.CarrierLookup).toBe('done');
    expect(final.sources.BreachDatabase).toBe('done');
    expect(final.sources.SocialGraph).toBe('done');
  });
});
