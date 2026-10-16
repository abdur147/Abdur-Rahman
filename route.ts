import { paymentVerifySchema } from '@/lib/validation';
import { isRazorpayConfigured, isServiceRoleConfigured } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { json } from '@/lib/order-access';
import { verifyPaymentSignature } from '@/lib/razorpay-signature';
import { fetchRazorpayPayment } from '@/lib/razorpay';

export const runtime = 'nodejs';

/**
 * Called by the browser after Razorpay Checkout succeeds.
 * 1) verify the HMAC signature with our secret key,
 * 2) double-check the payment with Razorpay's API (order id, amount, status),
 * 3) only then mark the payment + order as paid (idempotent DB function).
 */
export async function POST(request: Request) {
  if (!isServiceRoleConfigured() || !isRazorpayConfigured()) return json({ error: 'Payments are not configured.' }, 503);

  const parsed = paymentVerifySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: 'Invalid payment response.' }, 422);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const validSignature = verifyPaymentSignature({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    signature: razorpay_signature,
    keySecret: process.env.RAZORPAY_KEY_SECRET!,
  });
  if (!validSignature) return json({ error: 'Payment verification failed. If money was deducted, contact us with your order number.' }, 400);

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from('payments')
    .select('id, order_id, amount_paise, status')
    .eq('razorpay_order_id', razorpay_order_id)
    .maybeSingle();
  if (!payment) return json({ error: 'Payment record not found.' }, 404);
  if (payment.status === 'paid') return json({ ok: true, status: 'paid', paymentId: payment.id });

  let rzp;
  try {
    rzp = await fetchRazorpayPayment(razorpay_payment_id);
  } catch (e) {
    console.error('razorpay fetch failed', e);
    return json({ error: 'Could not confirm the payment with Razorpay yet. It will update automatically shortly.' }, 502);
  }

  if (rzp.order_id !== razorpay_order_id || rzp.amount !== payment.amount_paise || rzp.currency !== 'INR') {
    console.error('payment mismatch', { rzp, payment });
    return json({ error: 'Payment details did not match. Please contact us with your order number.' }, 400);
  }

  if (rzp.status === 'captured') {
    const { error } = await admin.rpc('mark_payment_paid', {
      p_payment_id: payment.id,
      p_razorpay_payment_id: razorpay_payment_id,
      p_method: rzp.method,
    });
    if (error) {
      console.error('mark_payment_paid failed', error.message);
      return json({ error: 'Payment received but could not be recorded. We will confirm it manually.' }, 500);
    }
    return json({ ok: true, status: 'paid', paymentId: payment.id });
  }

  if (rzp.status === 'authorized') {
    // Captured later (auto-capture). The webhook marks it paid when Razorpay captures it.
    await admin.from('payments').update({ status: 'authorized', method: rzp.method }).eq('id', payment.id).eq('status', 'created');
    return json({ ok: true, status: 'authorized', paymentId: payment.id });
  }

  return json({ error: `Payment status is "${rzp.status}". Please try again.` }, 400);
}
