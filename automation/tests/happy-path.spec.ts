import { test, expect } from '@playwright/test';
import { API_URL, APP_URL, KNOWN_CASES } from './constants';

async function getCase(request: import('@playwright/test').APIRequestContext, caseId: string) {
  const res = await request.get(`${API_URL}/cases/${caseId}`);
  expect(res.ok()).toBeTruthy();
  return res.json();
}

function enrichmentCountsByItemId(caseData: any): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const list of [caseData.phoneNumbers, caseData.emails, caseData.socialProfiles]) {
    for (const item of list) counts[item.id] = item.enrichments.length;
  }
  return counts;
}

test('running enrichment on a populated case adds one new result per item and reaches "completed"', async ({
  page,
  request,
}) => {
  const caseId = KNOWN_CASES.happyPathCase;

  // Snapshot per-item enrichment counts before, rather than assuming they
  // start at 0, keeps the test correct even if it's ever re-run against a
  // backend that wasn't freshly restarted.
  const before = await getCase(request, caseId);
  const beforeCounts = enrichmentCountsByItemId(before);
  expect(Object.keys(beforeCounts).length).toBeGreaterThan(0); // sanity: case has items to enrich

  await page.goto(`${APP_URL}/cases/${caseId}`);
  await expect(page.getByRole('heading', { name: before.name })).toBeVisible();

  await page.getByRole('button', { name: 'Run Enrichment' }).click();

  await expect(async () => {
    const job = await (await request.get(`${API_URL}/cases/${caseId}/enrichment-status`)).json();
    expect(job.status).toBe('completed');
  }).toPass({ timeout: 15_000, intervals: [500] });

  const after = await getCase(request, caseId);
  const afterCounts = enrichmentCountsByItemId(after);

  for (const itemId of Object.keys(beforeCounts)) {
    expect(afterCounts[itemId], `item ${itemId} should gain exactly one new enrichment`).toBe(
      beforeCounts[itemId] + 1,
    );
  }
});
