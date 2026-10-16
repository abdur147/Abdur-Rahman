import { z } from 'zod';
import { ORDER_STATUS_VALUES, normalizePhone } from './order-utils';
import { MAX_DELIVERABLE_BYTES, MAX_REFERENCE_BYTES, MAX_REFERENCE_FILES, isAllowedType } from './files';

const phone = z
  .string()
  .trim()
  .transform(normalizePhone)
  .refine((v) => /^\+?\d{10,15}$/.test(v), 'Enter a valid mobile number (10–15 digits).');

const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(160);
const name = z.string().trim().min(2, 'Please enter your name.').max(80, 'Name is too long.');

export const fileMetaSchema = z.object({
  name: z.string().min(1).max(180),
  type: z.string().refine(isAllowedType, 'This file type is not allowed.'),
  size: z.number().int().positive(),
});

export const referenceFileSchema = fileMetaSchema.refine((f) => f.size <= MAX_REFERENCE_BYTES, {
  message: 'Each file must be 20 MB or smaller.',
});

export const deliverableFileSchema = fileMetaSchema.refine((f) => f.size <= MAX_DELIVERABLE_BYTES, {
  message: 'Each file must be 50 MB or smaller.',
});

/** Spam protection fields included in every public form. */
const antiSpam = {
  website: z.string().max(0, 'Spam detected.').optional().default(''), // honeypot — must stay empty
  startedAt: z.number().int().positive(), // ms timestamp when the form was opened
};

export const orderSchema = z.object({
  serviceSlug: z.string().trim().min(1, 'Please choose a service.').max(120),
  packageTier: z.enum(['basic', 'standard', 'premium'], { message: 'Please choose a package.' }),
  name,
  phone,
  email,
  requirements: z
    .string()
    .trim()
    .min(20, 'Please describe your project in at least 20 characters.')
    .max(5000, 'Please keep the brief under 5,000 characters.'),
  deliveryPreference: z.enum(['standard', 'express', 'priority']),
  files: z.array(referenceFileSchema).max(MAX_REFERENCE_FILES, `Up to ${MAX_REFERENCE_FILES} files.`).default([]),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the terms and refund policy.' }) }),
  ...antiSpam,
});
export type OrderInput = z.infer<typeof orderSchema>;

export const contactSchema = z.object({
  name,
  email,
  phone: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? normalizePhone(v) : undefined))
    .refine((v) => !v || /^\+?\d{10,15}$/.test(v), 'Enter a valid mobile number.'),
  subject: z.string().trim().min(3, 'Please add a subject.').max(140),
  message: z.string().trim().min(10, 'Message is too short.').max(4000),
  ...antiSpam,
});
export type ContactInput = z.infer<typeof contactSchema>;

export const trackSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().min(8).max(40),
  email,
});

export const supportSchema = z.object({
  subject: z.string().trim().min(3, 'Please add a subject.').max(140),
  orderId: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  message: z.string().trim().min(10, 'Please describe the issue (min 10 characters).').max(4000),
});

export const profileSchema = z.object({
  full_name: name,
  phone: phone.optional().or(z.literal('')).transform((v) => v || null),
});

export const registerSchema = z.object({
  full_name: name,
  phone,
  email,
  password: z.string().min(8, 'Use at least 8 characters.').max(72),
});

export const statusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(ORDER_STATUS_VALUES),
  note: z.string().trim().max(1000).optional().transform((v) => v || null),
});

export const quoteSchema = z.object({
  orderId: z.string().uuid(),
  quotedAmount: z.coerce.number().min(0).max(10_000_000),
});

export const manualPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.coerce.number().positive('Amount must be greater than 0.').max(10_000_000),
  reference: z.string().trim().min(4, 'Enter the UPI / bank reference number.').max(80),
  note: z.string().trim().max(500).optional().transform((v) => v || null),
});

export const uploadRequestSchema = z.object({
  kind: z.enum(['reference', 'deliverable']),
  files: z.array(fileMetaSchema).min(1).max(10),
  token: z.string().max(128).optional(),
});

export const paymentCreateSchema = z.object({
  orderId: z.string().uuid(),
  token: z.string().max(128).optional(),
});

export const paymentVerifySchema = z.object({
  razorpay_order_id: z.string().min(5).max(64),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().min(10).max(256),
});

/** Turn a ZodError into { field: message } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Minimum time a human needs to fill a form (bots submit instantly). */
export const MIN_FORM_FILL_MS = 3000;

export function looksLikeBot(input: { website?: string; startedAt: number }, now = Date.now()): boolean {
  if (input.website) return true;
  if (now - input.startedAt < MIN_FORM_FILL_MS) return true;
  if (input.startedAt > now + 60_000) return true;
  return false;
}
