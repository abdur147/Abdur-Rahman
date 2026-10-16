import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/public';
import { isSupabaseConfigured } from './env';
import { DEFAULT_CONTENT } from './config';
import { SEED_FAQS, SEED_PACKAGES, SEED_PORTFOLIO, SEED_TESTIMONIALS, demoCatalog } from './catalog-data';
import type { Faq, PortfolioItem, PricingPackage, Service, ServiceCategory, SiteContent, Testimonial } from './types';

/**
 * Public catalogue data. When Supabase is not configured yet the site runs in
 * "demo mode" using lib/catalog-data.ts, so the design can be previewed.
 */

function fail(what: string, error: { message: string }): never {
  throw new Error(`Could not load ${what}: ${error.message}`);
}

export const getCatalog = cache(async (): Promise<ServiceCategory[]> => {
  if (!isSupabaseConfigured()) return demoCatalog();
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('service_categories')
    .select(
      'id, slug, name, tagline, description, icon, sort_order, is_active, services(id, category_id, slug, name, short_description, description, icon, image_url, starting_price, is_active, sort_order)',
    )
    .eq('is_active', true)
    .order('sort_order');
  if (error) fail('services', error);
  return (data as ServiceCategory[]).map((c) => ({
    ...c,
    services: (c.services ?? []).filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
  }));
});

export async function getServiceBySlug(slug: string): Promise<{ service: Service; category: ServiceCategory } | null> {
  const catalog = await getCatalog();
  for (const category of catalog) {
    const service = category.services.find((s) => s.slug === slug);
    if (service) return { service, category };
  }
  return null;
}

export const getPackages = cache(async (): Promise<PricingPackage[]> => {
  if (!isSupabaseConfigured()) return SEED_PACKAGES.map((p) => ({ ...p, id: `demo-pkg-${p.tier}` }));
  const { data, error } = await createPublicClient()
    .from('packages')
    .select('id, tier, name, tagline, price, features, delivery_time, revisions, is_featured, sort_order')
    .order('sort_order');
  if (error) fail('packages', error);
  return data as PricingPackage[];
});

export const getPortfolio = cache(async (): Promise<PortfolioItem[]> => {
  if (!isSupabaseConfigured()) return SEED_PORTFOLIO.map((p, i) => ({ ...p, id: `demo-pf-${i + 1}` }));
  const { data, error } = await createPublicClient()
    .from('portfolio_items')
    .select('id, title, category, description, image_url, before_url, after_url, is_demo, is_published, sort_order')
    .eq('is_published', true)
    .order('sort_order');
  if (error) fail('portfolio', error);
  return data as PortfolioItem[];
});

export const getTestimonials = cache(async (): Promise<Testimonial[]> => {
  if (!isSupabaseConfigured()) return SEED_TESTIMONIALS.map((t, i) => ({ ...t, id: `demo-t-${i + 1}` }));
  const { data, error } = await createPublicClient()
    .from('testimonials')
    .select('id, name, role, quote, is_placeholder, is_published, sort_order')
    .eq('is_published', true)
    .order('sort_order');
  if (error) fail('testimonials', error);
  return data as Testimonial[];
});

export const getFaqs = cache(async (): Promise<Faq[]> => {
  if (!isSupabaseConfigured()) return SEED_FAQS.map((f, i) => ({ ...f, id: `demo-f-${i + 1}` }));
  const { data, error } = await createPublicClient()
    .from('faqs')
    .select('id, question, answer, sort_order, is_published')
    .eq('is_published', true)
    .order('sort_order');
  if (error) fail('FAQs', error);
  return data as Faq[];
});

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  if (!isSupabaseConfigured()) return { ...DEFAULT_CONTENT };
  const { data, error } = await createPublicClient().from('site_content').select('key, value');
  if (error) {
    console.error('site_content load failed', error.message);
    return { ...DEFAULT_CONTENT };
  }
  const merged: SiteContent = { ...DEFAULT_CONTENT };
  for (const row of data ?? []) merged[row.key as string] = (row.value as string) ?? '';
  return merged;
});

/** Facts for the animated statistics — all derived from real data, nothing invented. */
export async function getStudioFacts() {
  const [catalog, packages] = await Promise.all([getCatalog(), getPackages()]);
  return {
    disciplines: catalog.length,
    services: catalog.reduce((n, c) => n + c.services.length, 0),
    packages: packages.length,
    stages: 5, // pending → confirmed → in progress → review → completed
  };
}
