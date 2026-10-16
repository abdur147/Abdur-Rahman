import 'server-only';
import { createAdminClient } from './supabase/admin';
import type { OrderFile, OrderStatusHistory, Payment } from './types';

/** Files, timeline and payments for ONE order. Call only after getOrderAccess() succeeded. */
export async function loadOrderBundle(orderId: string) {
  const admin = createAdminClient();
  const [files, history, payments] = await Promise.all([
    admin
      .from('order_files')
      .select('id, order_id, kind, storage_path, file_name, mime_type, size_bytes, upload_status, created_at')
      .eq('order_id', orderId)
      .eq('upload_status', 'uploaded')
      .order('created_at'),
    admin.from('order_status_history').select('id, order_id, status, note, created_at').eq('order_id', orderId).order('created_at'),
    admin
      .from('payments')
      .select('id, order_id, provider, razorpay_order_id, razorpay_payment_id, amount_paise, currency, status, method, receipt_number, reference, notes, created_at, verified_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }),
  ]);
  return {
    files: (files.data ?? []) as OrderFile[],
    history: (history.data ?? []) as OrderStatusHistory[],
    payments: (payments.data ?? []) as Payment[],
  };
}
