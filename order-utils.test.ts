import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_NUMBER_PATTERN,
  amountDue,
  formatINR,
  generateAccessToken,
  generateOrderNumber,
  normalizePhone,
  paiseToRupees,
  rupeesToPaise,
  sha256Hex,
} from '../lib/order-utils.ts';

test('order numbers use the IST date and an unambiguous alphabet', () => {
  // 20:00 UTC on 15 Oct = 01:30 IST on 16 Oct
  const n = generateOrderNumber(new Date('2026-10-15T20:00:00Z'));
  assert.match(n, /^ARDS-261016-[0-9A-HJKMNP-TV-Z]{5}$/);
  assert.match(n, ORDER_NUMBER_PATTERN);
  assert.ok(!/[ILOU]/.test(n.slice(12)), 'no I, L, O or U in the random part');
});

test('order numbers are practically unique', () => {
  const seen = new Set<string>();
  // 32^5 ≈ 33.5M combinations per day; 5,000 orders in one day → ~0.4 expected collisions
  // (the API also retries on the unique constraint).
  for (let i = 0; i < 5000; i++) seen.add(generateOrderNumber(new Date('2026-10-16T06:00:00Z')));
  assert.ok(seen.size >= 4996, `expected almost no collisions, got ${5000 - seen.size}`);
});

test('access tokens are 64 hex chars and hash deterministically', async () => {
  const t = generateAccessToken();
  assert.match(t, /^[0-9a-f]{64}$/);
  assert.notEqual(t, generateAccessToken());
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('money helpers avoid floating-point drift', () => {
  assert.equal(rupeesToPaise(19.99), 1999);
  assert.equal(rupeesToPaise(1499), 149900);
  assert.equal(paiseToRupees(149950), 1499.5);
  assert.equal(amountDue(1500, 500), 1000);
  assert.equal(amountDue(1500, 1500), 0);
  assert.equal(amountDue(1500, 2000), 0);
  assert.equal(amountDue(null, 0), 0, 'no quote means nothing payable yet');
  assert.equal(amountDue(999.99, 0.33), 999.66);
});

test('INR formatting', () => {
  assert.equal(formatINR(149900), '₹1,49,900');
  assert.equal(formatINR(null), '—');
});

test('phone normalisation keeps + and digits only', () => {
  assert.equal(normalizePhone('+91 91022-29867'), '+919102229867');
  assert.equal(normalizePhone(' 091022 29867 '), '09102229867');
});
