import { test, expect } from '@playwright/test';
import { API_URL } from './constants';

test.describe('Negative / error handling', () => {
  test('GET /cases/:id for a case that does not exist returns 404 with a clear error body', async ({ request }) => {
    const res = await request.get(`${API_URL}/cases/case-does-not-exist`);
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.statusCode).toBe(404);
    expect(body.message).toMatch(/not found/i);
  });

  test('POST /cases/:id/enrich for a case that does not exist returns 404, not a 500', async ({ request }) => {
    const res = await request.post(`${API_URL}/cases/case-does-not-exist/enrich`);
    expect(res.status()).toBe(404);
  });

  test('GET /enrichment-jobs/:jobId for a job that does not exist returns 404', async ({ request }) => {
    const res = await request.get(`${API_URL}/enrichment-jobs/not-a-real-job-id`);
    expect(res.status()).toBe(404);
  });
});
