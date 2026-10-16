/**
 * Fixed brand details. Editable marketing text (hero copy, contact email,
 * social links…) lives in the `site_content` table and is managed from
 * Admin → Content.
 */
export const SITE = {
  name: 'ABDUR RAHMAN DIGITAL STUDIO',
  shortName: 'Abdur Rahman Digital Studio',
  tagline: 'Your Vision. Our Creativity.',
  altTagline: 'Transforming Ideas Into Digital Excellence.',
  description:
    'Premium design, AI creativity, branding and digital solutions — all in one place. AI photo studio, graphic design, video editing, websites, branding and document design.',
  whatsappNumber: '919102229867',
  whatsappDisplay: '+91 91022 29867',
  upiId: 'kabdur82@axl',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  orderPrefix: 'ARDS',
} as const;

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
] as const;

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${SITE.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** UPI deep link — opens GPay / PhonePe / Paytm etc. on mobile. */
export function upiLink(amount?: number | null, note?: string): string {
  const params = new URLSearchParams({ pa: SITE.upiId, pn: SITE.name, cu: 'INR' });
  if (amount && amount > 0) params.set('am', amount.toFixed(2));
  if (note) params.set('tn', note.slice(0, 50));
  return `upi://pay?${params.toString()}`;
}

/** Default editable content; database values override these keys. */
export const DEFAULT_CONTENT: Record<string, string> = {
  hero_heading_line1: 'WE CREATE DIGITAL',
  hero_heading_line2: 'EXPERIENCES THAT INSPIRE.',
  hero_subheading: 'Premium Design, AI Creativity, Branding & Digital Solutions — All In One Place.',
  tagline: 'Your Vision. Our Creativity.',
  alt_tagline: 'Transforming Ideas Into Digital Excellence.',
  about_text:
    'ABDUR RAHMAN DIGITAL STUDIO is an online creative studio for AI photography, graphic design, video editing, websites, branding and professional documents. Every project is handled end-to-end — from your brief to the final files — with clear pricing, secure payments and live order tracking.',
  contact_email: 'hello@your-domain.com',
  business_hours: '',
  location_line: 'Working online with clients across India and worldwide',
  announcement: '',
  social_instagram: '',
  social_facebook: '',
  social_youtube: '',
  social_linkedin: '',
  social_x: '',
  social_behance: '',
};

export const CONTENT_FIELDS: { key: string; label: string; multiline?: boolean; help?: string }[] = [
  { key: 'announcement', label: 'Announcement bar (leave empty to hide)' },
  { key: 'hero_heading_line1', label: 'Hero heading — line 1' },
  { key: 'hero_heading_line2', label: 'Hero heading — line 2 (gold)' },
  { key: 'hero_subheading', label: 'Hero subheading', multiline: true },
  { key: 'tagline', label: 'Tagline' },
  { key: 'alt_tagline', label: 'Alternative tagline' },
  { key: 'about_text', label: 'About the studio', multiline: true },
  { key: 'contact_email', label: 'Business email', help: 'Shown on the contact page and footer.' },
  { key: 'business_hours', label: 'Business hours (optional)', help: 'Example: Mon–Sat, 10 AM – 8 PM IST' },
  { key: 'location_line', label: 'Location line' },
  { key: 'social_instagram', label: 'Instagram URL' },
  { key: 'social_facebook', label: 'Facebook URL' },
  { key: 'social_youtube', label: 'YouTube URL' },
  { key: 'social_linkedin', label: 'LinkedIn URL' },
  { key: 'social_x', label: 'X (Twitter) URL' },
  { key: 'social_behance', label: 'Behance URL' },
];
