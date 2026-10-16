import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyPaymentSignature, verifyWebhookSignature } from '../lib/razorpay-signature.ts';

const SECRET = 'test_secret_123';

test('accepts a genuine checkout signature', () => {
  const signature = createHmac('sha256', SECRET).update('order_ABC|pay_XYZ').digest('hex');
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ', signature, keySecret: SECRET }), true);
});

test('rejects a signature for a different payment or order', () => {
  const signature = createHmac('sha256', SECRET).update('order_ABC|pay_XYZ').digest('hex');
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_OTHER', signature, keySecret: SECRET }), false);
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_OTHER', razorpayPaymentId: 'pay_XYZ', signature, keySecret: SECRET }), false);
});

test('rejects signatures made with another secret, truncated, or empty', () => {
  const forged = createHmac('sha256', 'attacker').update('order_ABC|pay_XYZ').digest('hex');
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ', signature: forged, keySecret: SECRET }), false);
  const good = createHmac('sha256', SECRET).update('order_ABC|pay_XYZ').digest('hex');
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ', signature: good.slice(0, 20), keySecret: SECRET }), false);
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ', signature: '', keySecret: SECRET }), false);
  assert.equal(verifyPaymentSignature({ razorpayOrderId: 'order_ABC', razorpayPaymentId: 'pay_XYZ', signature: good, keySecret: '' }), false);
});

test('webhook signature covers the exact raw body', () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', amount: 49900 } } } });
  const sig = createHmac('sha256', 'whsec').update(body).digest('hex');
  assert.equal(verifyWebhookSignature(body, sig, 'whsec'), true);
  assert.equal(verifyWebhookSignature(body.replace('49900', '100'), sig, 'whsec'), false, 'tampered amount must fail');
  assert.equal(verifyWebhookSignature(body, null, 'whsec'), false);
  assert.equal(verifyWebhookSignature(body, sig, ''), false);
});
