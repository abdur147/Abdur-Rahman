/** Pure aggregation helpers for revenue reports (unit-testable). */

export interface PaidPayment {
  amount_paise: number;
  verified_at: string | null;
  service_name?: string | null;
}

/** Last `months` calendar months (IST) with total revenue in rupees, oldest first. */
export function revenueByMonth(payments: PaidPayment[], months = 12, now = new Date()): { key: string; label: string; total: number }[] {
  const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3600_000);
  const nowIst = ist(now);
  const buckets: { key: string; label: string; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' }) + (d.getUTCMonth() === 0 || i === months - 1 ? ` ${String(d.getUTCFullYear()).slice(2)}` : '');
    buckets.push({ key, label, total: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const p of payments) {
    if (!p.verified_at) continue;
    const d = ist(new Date(p.verified_at));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const i = index.get(key);
    if (i !== undefined) buckets[i]!.total += p.amount_paise / 100;
  }
  return buckets.map((b) => ({ ...b, total: Math.round(b.total * 100) / 100 }));
}

export function revenueByService(payments: PaidPayment[]): { name: string; total: number; count: number }[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const p of payments) {
    const name = p.service_name || 'Other';
    const cur = map.get(name) ?? { total: 0, count: 0 };
    cur.total += p.amount_paise / 100;
    cur.count += 1;
    map.set(name, cur);
  }
  return [...map.entries()].map(([name, v]) => ({ name, total: Math.round(v.total * 100) / 100, count: v.count })).sort((a, b) => b.total - a.total);
}
