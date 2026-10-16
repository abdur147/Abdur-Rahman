import 'server-only';

const API = 'https://api.razorpay.com/v1';

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID ?? '';
  const secret = process.env.RAZORPAY_KEY_SECRET ?? '';
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
}

export class RazorpayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader(), ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as { error?: { description?: string } } & T;
  if (!res.ok) {
    throw new RazorpayError(body?.error?.description ?? `Razorpay request failed (${res.status})`, res.status);
  }
  return body;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  method: string;
  email?: string;
  contact?: string;
}

export function createRazorpayOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
  return call<RazorpayOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt.slice(0, 40),
      notes: input.notes ?? {},
    }),
  });
}

export function fetchRazorpayPayment(paymentId: string) {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}
