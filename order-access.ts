import 'server-only';
import { createAdminClient } from './supabase/admin';
import { getSession } from './auth';
import { sha256Hex } from './order-utils';
import type { Order } from './types';

export type OrderAccess = { order: Order; via: 'owner' | 'admin' | 'token'; userId: string | null; isAdmin: boolean };

const ORDER_COLUMNS =
  'id, order_number, user_id, service_id, package_id, service_name, package_name, customer_name, customer_phone, customer_email, requirements, delivery_preference, status, quoted_amount, amount_paid, payment_status, admin_notes, created_at, updated_at, access_token_hash';

/**
 * Decide whether the current visitor may access an order:
 *   • the signed-in owner, • an admin, or • a guest holding the order's secret link token.
 * Uses the service-role client, so callers MUST rely on this check.
 */
export async function getOrderAccess(where: { id?: string; orderNumber?: string }, token?: string | null): Promise<OrderAccess | null> {
  const admin = createAdminClient();
  let query = admin.from('orders').select(ORDER_COLUMNS);
  if (where.id) query = query.eq('id', where.id);
  else if (where.orderNumber) query = query.eq('order_number', where.orderNumber);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  const { access_token_hash, ...order } = data as Order & { access_token_hash: string };

  const { user, profile } = await getSession();
  const isAdmin = profile?.role === 'admin';
  if (isAdmin) return { order, via: 'admin', userId: user?.id ?? null, isAdmin };
  if (user && order.user_id === user.id) return { order, via: 'owner', userId: user.id, isAdmin: false };
  if (token && token.length >= 32 && (await sha256Hex(token)) === access_token_hash) {
    return { order, via: 'token', userId: user?.id ?? null, isAdmin: false };
  }
  return null;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
