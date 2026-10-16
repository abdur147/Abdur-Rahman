import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revenueByMonth, revenueByService } from '../lib/reports.ts';

test('revenue is bucketed by India-time month', () => {
  const now = new Date('2026-10-16T06:00:00Z');
  const months = revenueByMonth(
    [
      { amount_paise: 100000, verified_at: '2026-10-01T10:00:00Z' },
      // 30 Sep 19:00 UTC = 1 Oct 00:30 IST → October
      { amount_paise: 50000, verified_at: '2026-09-30T19:00:00Z' },
      { amount_paise: 25050, verified_at: '2026-09-15T10:00:00Z' },
      { amount_paise: 99900, verified_at: '2024-01-01T10:00:00Z' }, // too old, ignored
      { amount_paise: 99900, verified_at: null },
    ],
    3,
    now,
  );
  assert.deepEqual(
    months.map((m) => [m.key, m.total]),
    [
      ['2026-08', 0],
      ['2026-09', 250.5],
      ['2026-10', 1500],
    ],
  );
});

test('revenue by service sorts by total', () => {
  const rows = revenueByService([
    { amount_paise: 10000, verified_at: 'x', service_name: 'Logo' },
    { amount_paise: 50000, verified_at: 'x', service_name: 'Website' },
    { amount_paise: 10000, verified_at: 'x', service_name: 'Logo' },
  ]);
  assert.deepEqual(rows, [
    { name: 'Website', total: 500, count: 1 },
    { name: 'Logo', total: 200, count: 2 },
  ]);
});
