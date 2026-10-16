import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildStoragePath, isAllowedType, sanitizeFileName } from '../lib/files.ts';

test('file names are made safe for storage', () => {
  assert.equal(sanitizeFileName('My Photo (1).JPG'), 'my-photo-1.jpg');
  assert.equal(sanitizeFileName('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFileName('C:\\Users\\me\\Résumé Final.pdf'), 'resume-final.pdf');
  assert.equal(sanitizeFileName('.env'), 'env');
  assert.equal(sanitizeFileName('????.png'), 'file.png');
});

test('storage paths stay inside the order folder', () => {
  const p = buildStoragePath('order-uuid', 'reference', '../../secret.png', 'u1');
  assert.equal(p, 'order-uuid/reference/u1-secret.png');
  assert.ok(!p.includes('..'));
});

test('only allowed MIME types pass', () => {
  assert.equal(isAllowedType('image/jpeg'), true);
  assert.equal(isAllowedType('application/pdf'), true);
  assert.equal(isAllowedType('application/x-msdownload'), false);
  assert.equal(isAllowedType('text/html'), false);
  assert.equal(isAllowedType('toString'), false);
});
