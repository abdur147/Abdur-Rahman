'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminOrNull } from '@/lib/auth';
import { manualPaymentSchema, quoteSchema, statusUpdateSchema } from '@/lib/validation';
import { ORDER_FILES_BUCKET, PORTFOLIO_BUCKET } from '@/lib/files';
import { CONTENT_FIELDS } from '@/lib/config';
import { SERVICE_ICON_NAMES } from '@/components/ui/ServiceIcon';

/** Every admin action starts here. RLS enforces the same rule again in the database. */
async function adminClient() {
  const session = await getAdminOrNull();
  if (!session) throw new Error('Not authorized');
  return { supabase: await createClient(), userId: session.user!.id };
}

function back(path: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`${path}${qs ? `?${qs}` : ''}`);
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const optPrice = (v: string) => (v === '' ? null : Number(v));
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

function refreshPublic() {
  revalidatePath('/', 'layout');
}

/* ── Orders ───────────────────────────────────────────── */
export async function updateOrderStatus(fd: FormData) {
  const { supabase } = await adminClient();
  const parsed = statusUpdateSchema.safeParse({ orderId: str(fd, 'orderId'), status: str(fd, 'status'), note: str(fd, 'note') });
  if (!parsed.success) back(`/admin/orders/${str(fd, 'orderId')}`, { error: parsed.error.issues[0]?.message ?? 'Invalid status' });
  const { error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: parsed.data.orderId,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });
  if (error) back(`/admin/orders/${parsed.data.orderId}`, { error: error.message });
  revalidatePath('/admin', 'layout');
  back(`/admin/orders/${parsed.data.orderId}`, { saved: 'status' });
}

export async function setOrderQuote(fd: FormData) {
  const { supabase } = await adminClient();
  const parsed = quoteSchema.safeParse({ orderId: str(fd, 'orderId'), quotedAmount: str(fd, 'quotedAmount') });
  if (!parsed.success) back(`/admin/orders/${str(fd, 'orderId')}`, { error: 'Enter a valid amount.' });
  const { orderId, quotedAmount } = parsed.data;
  const { data: order } = await supabase.from('orders').select('amount_paid').eq('id', orderId).single();
  const paid = Number(order?.amount_paid ?? 0);
  const payment_status = quotedAmount > 0 && paid >= quotedAmount ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid';
  const { error } = await supabase
    .from('orders')
    .update({ quoted_amount: quotedAmount > 0 ? quotedAmount : null, payment_status })
    .eq('id', orderId);
  if (error) back(`/admin/orders/${orderId}`, { error: error.message });
  await supabase.from('order_status_history').insert({
    order_id: orderId,
    status: (await supabase.from('orders').select('status').eq('id', orderId).single()).data?.status ?? 'pending',
    note: quotedAmount > 0 ? `Price confirmed: ₹${quotedAmount.toLocaleString('en-IN')}` : 'Quote cleared',
  });
  revalidatePath('/admin', 'layout');
  back(`/admin/orders/${orderId}`, { saved: 'quote' });
}

export async function saveAdminNotes(fd: FormData) {
  const { supabase } = await adminClient();
  const orderId = str(fd, 'orderId');
  const { error } = await supabase.from('orders').update({ admin_notes: str(fd, 'admin_notes').slice(0, 4000) || null }).eq('id', orderId);
  if (error) back(`/admin/orders/${orderId}`, { error: error.message });
  back(`/admin/orders/${orderId}`, { saved: 'notes' });
}

export async function recordManualPayment(fd: FormData) {
  const { supabase } = await adminClient();
  const parsed = manualPaymentSchema.safeParse({
    orderId: str(fd, 'orderId'),
    amount: str(fd, 'amount'),
    reference: str(fd, 'reference'),
    note: str(fd, 'note'),
  });
  if (!parsed.success) back(`/admin/orders/${str(fd, 'orderId')}`, { error: parsed.error.issues[0]?.message ?? 'Invalid payment' });
  const { error } = await supabase.rpc('record_manual_payment', {
    p_order_id: parsed.data.orderId,
    p_amount: parsed.data.amount,
    p_reference: parsed.data.reference,
    p_note: parsed.data.note,
  });
  if (error) back(`/admin/orders/${parsed.data.orderId}`, { error: error.message });
  revalidatePath('/admin', 'layout');
  back(`/admin/orders/${parsed.data.orderId}`, { saved: 'payment' });
}

export async function deleteOrderFile(fd: FormData) {
  await adminClient();
  const fileId = str(fd, 'fileId');
  const orderId = str(fd, 'orderId');
  const admin = createAdminClient();
  const { data: file } = await admin.from('order_files').select('storage_path').eq('id', fileId).eq('order_id', orderId).single();
  if (file) {
    await admin.storage.from(ORDER_FILES_BUCKET).remove([file.storage_path as string]);
    await admin.from('order_files').delete().eq('id', fileId);
  }
  back(`/admin/orders/${orderId}`, { saved: 'file-deleted' });
}

/* ── Services & categories ────────────────────────────── */
const serviceSchema = z.object({
  name: z.string().min(2).max(120),
  short_description: z.string().max(240),
  description: z.string().max(4000),
  icon: z.string().refine((v) => SERVICE_ICON_NAMES.includes(v), 'Unknown icon'),
  starting_price: z.number().min(0).max(10_000_000).nullable(),
  image_url: z.string().url().nullable().or(z.literal('').transform(() => null)),
  is_active: z.boolean(),
  sort_order: z.number().int().min(0).max(999),
});

function readService(fd: FormData) {
  return serviceSchema.safeParse({
    name: str(fd, 'name'),
    short_description: str(fd, 'short_description'),
    description: str(fd, 'description'),
    icon: str(fd, 'icon') || 'Sparkles',
    starting_price: optPrice(str(fd, 'starting_price')),
    image_url: str(fd, 'image_url'),
    is_active: fd.get('is_active') === 'on',
    sort_order: Number(str(fd, 'sort_order') || 0),
  });
}

export async function updateService(fd: FormData) {
  const { supabase } = await adminClient();
  const id = str(fd, 'id');
  const parsed = readService(fd);
  if (!parsed.success) back('/admin/services', { error: parsed.error.issues[0]?.message ?? 'Invalid service' });
  const { error } = await supabase.from('services').update({ ...parsed.data, category_id: str(fd, 'category_id') }).eq('id', id);
  if (error) back('/admin/services', { error: error.message });
  refreshPublic();
  back('/admin/services', { saved: parsed.data.name });
}

export async function createService(fd: FormData) {
  const { supabase } = await adminClient();
  const parsed = readService(fd);
  if (!parsed.success) back('/admin/services', { error: parsed.error.issues[0]?.message ?? 'Invalid service' });
  const slug = slugify(str(fd, 'slug') || parsed.data.name);
  const { error } = await supabase.from('services').insert({ ...parsed.data, slug, category_id: str(fd, 'category_id') });
  if (error) back('/admin/services', { error: error.code === '23505' ? 'A service with this URL slug already exists.' : error.message });
  refreshPublic();
  back('/admin/services', { saved: parsed.data.name });
}

export async function deleteService(fd: FormData) {
  const { supabase } = await adminClient();
  const { error } = await supabase.from('services').delete().eq('id', str(fd, 'id'));
  if (error) back('/admin/services', { error: error.message });
  refreshPublic();
  back('/admin/services', { saved: 'deleted' });
}

export async function createCategory(fd: FormData) {
  const { supabase } = await adminClient();
  const name = str(fd, 'name');
  if (name.length < 2) back('/admin/services', { error: 'Category name is required.' });
  const icon = SERVICE_ICON_NAMES.includes(str(fd, 'icon')) ? str(fd, 'icon') : 'Sparkles';
  const { error } = await supabase.from('service_categories').insert({
    name,
    slug: slugify(name),
    tagline: str(fd, 'tagline'),
    description: str(fd, 'description'),
    icon,
    sort_order: Number(str(fd, 'sort_order') || 99),
  });
  if (error) back('/admin/services', { error: error.code === '23505' ? 'That category already exists.' : error.message });
  refreshPublic();
  back('/admin/services', { saved: name });
}

/* ── Packages ─────────────────────────────────────────── */
export async function updatePackage(fd: FormData) {
  const { supabase } = await adminClient();
  const id = str(fd, 'id');
  const price = optPrice(str(fd, 'price'));
  if (price !== null && (Number.isNaN(price) || price < 0)) back('/admin/packages', { error: 'Enter a valid price or leave it empty.' });
  const features = str(fd, 'features')
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean)
    .slice(0, 12);
  const { error } = await supabase
    .from('packages')
    .update({
      name: str(fd, 'name'),
      tagline: str(fd, 'tagline'),
      price,
      features,
      delivery_time: str(fd, 'delivery_time'),
      revisions: str(fd, 'revisions'),
      is_featured: fd.get('is_featured') === 'on',
    })
    .eq('id', id);
  if (error) back('/admin/packages', { error: error.message });
  refreshPublic();
  back('/admin/packages', { saved: str(fd, 'name') });
}

/* ── Portfolio ────────────────────────────────────────── */
const PORTFOLIO_CATS = ['ai_photography', 'graphic_design', 'logo_design', 'video_editing', 'website_development', 'social_media'];

export async function createPortfolioItem(fd: FormData) {
  const { supabase } = await adminClient();
  const title = str(fd, 'title');
  const category = str(fd, 'category');
  if (title.length < 2 || !PORTFOLIO_CATS.includes(category)) back('/admin/portfolio', { error: 'Title and category are required.' });
  const url = (k: string) => {
    const v = str(fd, k);
    return /^https:\/\//.test(v) ? v : null;
  };
  const { error } = await supabase.from('portfolio_items').insert({
    title,
    category,
    description: str(fd, 'description'),
    image_url: url('image_url'),
    before_url: url('before_url'),
    after_url: url('after_url'),
    is_demo: fd.get('is_demo') === 'on',
    is_published: fd.get('is_published') === 'on',
    sort_order: Number(str(fd, 'sort_order') || 0),
  });
  if (error) back('/admin/portfolio', { error: error.message });
  refreshPublic();
  back('/admin/portfolio', { saved: title });
}

export async function togglePortfolioItem(fd: FormData) {
  const { supabase } = await adminClient();
  await supabase.from('portfolio_items').update({ is_published: str(fd, 'publish') === 'true' }).eq('id', str(fd, 'id'));
  refreshPublic();
  back('/admin/portfolio', {});
}

export async function deletePortfolioItem(fd: FormData) {
  const { supabase } = await adminClient();
  const id = str(fd, 'id');
  const { data: item } = await supabase.from('portfolio_items').select('image_url, before_url, after_url').eq('id', id).single();
  // Remove uploaded images from our public bucket (ignore external URLs).
  const marker = `/storage/v1/object/public/${PORTFOLIO_BUCKET}/`;
  const paths = [item?.image_url, item?.before_url, item?.after_url]
    .filter((u): u is string => typeof u === 'string' && u.includes(marker))
    .map((u) => decodeURIComponent(u.split(marker)[1]!));
  if (paths.length) await supabase.storage.from(PORTFOLIO_BUCKET).remove(paths);
  await supabase.from('portfolio_items').delete().eq('id', id);
  refreshPublic();
  back('/admin/portfolio', { saved: 'deleted' });
}

/* ── Messages & support ───────────────────────────────── */
export async function setMessageStatus(fd: FormData) {
  const { supabase } = await adminClient();
  const status = str(fd, 'status');
  if (!['new', 'read', 'replied'].includes(status)) back('/admin/messages', { error: 'Invalid status' });
  await supabase.from('contact_messages').update({ status }).eq('id', str(fd, 'id'));
  revalidatePath('/admin', 'layout');
  back('/admin/messages', {});
}

export async function deleteMessage(fd: FormData) {
  const { supabase } = await adminClient();
  await supabase.from('contact_messages').delete().eq('id', str(fd, 'id'));
  revalidatePath('/admin', 'layout');
  back('/admin/messages', {});
}

export async function replyTicket(fd: FormData) {
  const { supabase } = await adminClient();
  const reply = str(fd, 'reply');
  const close = fd.get('close') === 'on';
  if (reply.length < 2 && !close) back('/admin/messages', { tab: 'support', error: 'Write a reply first.' });
  const { error } = await supabase
    .from('support_tickets')
    .update({
      ...(reply ? { admin_reply: reply.slice(0, 4000), replied_at: new Date().toISOString() } : {}),
      status: close ? 'closed' : 'answered',
    })
    .eq('id', str(fd, 'id'));
  if (error) back('/admin/messages', { tab: 'support', error: error.message });
  revalidatePath('/admin', 'layout');
  back('/admin/messages', { tab: 'support', saved: 'reply' });
}

/* ── Website content ──────────────────────────────────── */
export async function saveSiteContent(fd: FormData) {
  const { supabase } = await adminClient();
  const rows = CONTENT_FIELDS.map((f) => {
    let value = str(fd, f.key).slice(0, 2000);
    if (f.key.startsWith('social_') && value && !/^https:\/\//.test(value)) value = '';
    return { key: f.key, value, updated_at: new Date().toISOString() };
  });
  const { error } = await supabase.from('site_content').upsert(rows, { onConflict: 'key' });
  if (error) back('/admin/content', { error: error.message });
  refreshPublic();
  back('/admin/content', { saved: 'content' });
}

export async function upsertTestimonial(fd: FormData) {
  const { supabase } = await adminClient();
  const id = str(fd, 'id');
  const row = {
    name: str(fd, 'name'),
    role: str(fd, 'role'),
    quote: str(fd, 'quote'),
    is_placeholder: fd.get('is_placeholder') === 'on',
    is_published: fd.get('is_published') === 'on',
    sort_order: Number(str(fd, 'sort_order') || 0),
  };
  if (row.name.length < 2 || row.quote.length < 5) back('/admin/content', { tab: 'testimonials', error: 'Name and quote are required.' });
  const { error } = id ? await supabase.from('testimonials').update(row).eq('id', id) : await supabase.from('testimonials').insert(row);
  if (error) back('/admin/content', { tab: 'testimonials', error: error.message });
  refreshPublic();
  back('/admin/content', { tab: 'testimonials', saved: 'testimonial' });
}

export async function deleteTestimonial(fd: FormData) {
  const { supabase } = await adminClient();
  await supabase.from('testimonials').delete().eq('id', str(fd, 'id'));
  refreshPublic();
  back('/admin/content', { tab: 'testimonials' });
}

export async function upsertFaq(fd: FormData) {
  const { supabase } = await adminClient();
  const id = str(fd, 'id');
  const row = {
    question: str(fd, 'question'),
    answer: str(fd, 'answer'),
    is_published: fd.get('is_published') === 'on',
    sort_order: Number(str(fd, 'sort_order') || 0),
  };
  if (row.question.length < 5 || row.answer.length < 5) back('/admin/content', { tab: 'faqs', error: 'Question and answer are required.' });
  const { error } = id ? await supabase.from('faqs').update(row).eq('id', id) : await supabase.from('faqs').insert(row);
  if (error) back('/admin/content', { tab: 'faqs', error: error.message });
  refreshPublic();
  back('/admin/content', { tab: 'faqs', saved: 'faq' });
}

export async function deleteFaq(fd: FormData) {
  const { supabase } = await adminClient();
  await supabase.from('faqs').delete().eq('id', str(fd, 'id'));
  refreshPublic();
  back('/admin/content', { tab: 'faqs' });
}
