import { formatINR } from './order-utils';

/** Public label for a price that may not be set yet (we never invent prices). */
export function priceLabel(price: number | null | undefined, prefix = 'Starting from'): { label: string; value: string; onRequest: boolean } {
  if (price === null || price === undefined || price <= 0) {
    return { label: 'Pricing', value: 'On request', onRequest: true };
  }
  return { label: prefix, value: formatINR(price), onRequest: false };
}
