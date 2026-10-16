/**
 * Pure order helpers — no framework imports, so they run in the browser,
 * on the server and in the Node test runner.
 */
import type { DeliveryPreference, OrderPaymentStatus, OrderStatus, PackageTier } from './types';

export const ORDER_STATUSES: { value: OrderStatus; label: string; description: string; tone: string }[] = [
  { value: 'pending', label: 'Pending', description: 'Order received — awaiting review by the studio.', tone: 'amber' },
  { value: 'confirmed', label: 'Confirmed', description: 'Brief reviewed and the order is confirmed.', tone: 'blue' },
  { value: 'in_progress', label: 'In Progress', description: 'Our team is working on your project.', tone: 'violet' },
  { value: 'ready_for_review', label: 'Ready for Review', description: 'A draft is ready — please review and share feedback.', tone: 'cyan' },
  { value: 'completed', label: 'Completed', description: 'Final files delivered. Thank you!', tone: 'green' },
  { value: 'cancelled', label: 'Cancelled', description: 'This order was cancelled.', tone: 'red' },
];

export const ORDER_STATUS_VALUES = ORDER_STATUSES.map((s) => s.value) as [OrderStatus, ...OrderStatus[]];

/** The happy-path sequence shown as a progress timeline. */
export const ORDER_PROGRESS: OrderStatus[] = ['pending', 'confirmed', 'in_progress', 'ready_for_review', 'completed'];

export function statusMeta(status: OrderStatus) {
  return ORDER_STATUSES.find((s) => s.value === status) ?? ORDER_STATUSES[0]!;
}

export const PAYMENT_STATUS_LABEL: Record<OrderPaymentStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  refunded: 'Refunded',
};

export const PACKAGE_TIERS: PackageTier[] = ['basic', 'standard', 'premium'];

export const DELIVERY_OPTIONS: { value: DeliveryPreference; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Delivery within the package timeline.' },
  { value: 'express', label: 'Express', description: 'Faster turnaround. Any extra fee is confirmed with your quote.' },
  { value: 'priority', label: 'Priority', description: 'Top of the queue for urgent deadlines. Any extra fee is confirmed with your quote.' },
];

// Crockford base32 without I, L, O, U — easy to read aloud and type.
const ORDER_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/** Example: ARDS-261016-7K3QX (prefix-YYMMDD-5 random chars, ~33.5M per day). */
export function generateOrderNumber(date: Date = new Date(), prefix = 'ARDS'): string {
  // Use India time for the date part.
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  const yy = String(ist.getUTCFullYear()).slice(-2);
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  const rand = Array.from(randomBytes(5), (b) => ORDER_ALPHABET[b % 32]).join('');
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

export const ORDER_NUMBER_PATTERN = /^[A-Z]{2,6}-\d{6}-[0-9A-HJKMNP-TV-Z]{5}$/;

/** 32 random bytes as hex — the guest access token for an order. */
export function generateAccessToken(): string {
  return Array.from(randomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2, minimumFractionDigits: 0 });

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return inr.format(amount);
}

/** Rupees → paise as an integer, rejecting fractions of a paisa. */
export function rupeesToPaise(amount: number): number {
  return Math.round(amount * 100);
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

/** Keeps a leading + and digits only. "+91 91022-29867" → "+919102229867". */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

export function amountDue(quoted: number | null | undefined, paid: number | null | undefined): number {
  if (!quoted || quoted <= 0) return 0;
  return Math.max(0, Math.round((quoted - (paid ?? 0)) * 100) / 100);
}
