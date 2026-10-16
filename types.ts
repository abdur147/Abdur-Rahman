export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'ready_for_review'
  | 'completed'
  | 'cancelled';

export type OrderPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
export type PaymentRecordStatus = 'created' | 'authorized' | 'paid' | 'failed' | 'refunded';
export type PackageTier = 'basic' | 'standard' | 'premium';
export type DeliveryPreference = 'standard' | 'express' | 'priority';
export type UserRole = 'customer' | 'admin';
export type FileKind = 'reference' | 'deliverable';

export type PortfolioCategory =
  | 'ai_photography'
  | 'graphic_design'
  | 'logo_design'
  | 'video_editing'
  | 'website_development'
  | 'social_media';

export interface Service {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  icon: string;
  image_url: string | null;
  starting_price: number | null;
  is_active: boolean;
  sort_order: number;
}

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  services: Service[];
}

export interface PricingPackage {
  id: string;
  tier: PackageTier;
  name: string;
  tagline: string;
  price: number | null;
  features: string[];
  delivery_time: string;
  revisions: string;
  is_featured: boolean;
  sort_order: number;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: PortfolioCategory;
  description: string;
  image_url: string | null;
  before_url: string | null;
  after_url: string | null;
  is_demo: boolean;
  is_published: boolean;
  sort_order: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  is_placeholder: boolean;
  is_published: boolean;
  sort_order: number;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

export type SiteContent = Record<string, string>;

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  service_id: string | null;
  package_id: string | null;
  service_name: string;
  package_name: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  requirements: string;
  delivery_preference: DeliveryPreference;
  status: OrderStatus;
  quoted_amount: number | null;
  amount_paid: number;
  payment_status: OrderPaymentStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderFile {
  id: string;
  order_id: string;
  kind: FileKind;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  upload_status: 'pending' | 'uploaded';
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: 'razorpay' | 'manual';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount_paise: number;
  currency: string;
  status: PaymentRecordStatus;
  method: string | null;
  receipt_number: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  verified_at: string | null;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  order_id: string | null;
  subject: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  created_at: string;
}
