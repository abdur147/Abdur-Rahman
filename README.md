# ABDUR RAHMAN DIGITAL STUDIO — Website

*Your Vision. Our Creativity.*

A complete, production-ready creative-agency website with online ordering, secure file uploads, a customer dashboard, an admin panel and Razorpay payments.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Lucide icons · Supabase (PostgreSQL, Auth, Storage) · Razorpay · Vercel

---

## Contents

1. [What's included](#1-whats-included)
2. [Integrations you need to set up](#2-integrations-you-need-to-set-up)
3. [Step-by-step setup (about 30 minutes)](#3-step-by-step-setup)
4. [Test the critical flows](#4-test-the-critical-flows)
5. [Going live with real payments](#5-going-live-with-real-payments)
6. [Everyday admin tasks](#6-everyday-admin-tasks)
7. [Project structure](#7-project-structure)
8. [Security design](#8-security-design)
9. [Automated tests](#9-automated-tests)
10. [What was verified, and what to check on first build](#10-what-was-verified-and-what-to-check-on-first-build)

---

## 1. What's included

| Area | Features |
|---|---|
| **Public website** | Full-screen animated hero (“The Aperture”), service bento grid, animated statistics (computed from real data — never invented), process steps, portfolio teaser, packages, testimonials, FAQ, CTA. Dark **and** light mode, mobile menu, WhatsApp floating button, smooth page transitions, intro loader, SEO metadata, sitemap, robots.txt, JSON-LD. |
| **Services** | 6 categories, 32 services. Each has an icon, description, starting price (“On request” until you set one), *Details* and *Order Now*. Search + category navigation. Detail page per service. |
| **Online ordering** | 6-step wizard: service → package → name / mobile / email → requirements + file uploads → delivery preference → review → submit. Unique order ID (e.g. `ARDS-261016-7K3QX`), confirmation page, private link for guests, order saved to the database and shown in the admin panel. |
| **Customer dashboard** | Register, login, logout, password reset, my orders, live status timeline (Pending → Confirmed → In Progress → Ready for Review → Completed / Cancelled), project details, upload more files, download completed files, pay online, payment history with receipts, support requests with replies, profile. Guest orders are attached automatically when the customer registers with the same (verified) email. |
| **Admin panel** | Overview (new orders, revenue, status breakdown), orders (search, filter, pagination), order detail (update status with timeline note, set price/quote, upload deliverables, record direct UPI payments, private notes, contact customer by email/phone/WhatsApp), customers, services & pricing (edit/add/delete services and categories), packages, portfolio (upload images, before/after pairs, hide/delete demos), payments, revenue reports, contact messages & support tickets, website content (hero text, taglines, business email, social links, testimonials, FAQs). |
| **Payments** | Razorpay Checkout (UPI, debit/credit cards, net banking). Amount always computed on the server. Signature verified on the server **and** re-checked with Razorpay’s API before an order is marked paid. Webhook for reliability. Printable receipts. Direct-UPI fallback to `kabdur82@axl` with admin verification. Test mode badge. |
| **Portfolio** | Category filters, full-screen lightbox with keyboard navigation, accessible before/after slider, hover effects. 12 clearly labelled **demo** projects (generated artwork — no stock or copyrighted images) until you upload real work. |
| **Contact** | WhatsApp click-to-chat, contact form (honeypot + timing + rate-limit spam protection), business email placeholder, social links (shown once configured), customer support section, UPI ID labelled for payments only. |
| **Legal** | Privacy Policy, Terms & Conditions, Refund Policy (starting templates — please review). |

**Honesty rules built in:** no invented prices (all start as “On request”), no invented statistics, testimonials marked as placeholders, portfolio items marked as demos, and the site clearly says when an integration (ordering, payments) isn’t connected yet — falling back to WhatsApp instead of pretending.

---

## 2. Integrations you need to set up

Nothing below is pre-configured — the site works in **preview mode** until you add these.

| Integration | Required? | What it enables | Where |
|---|---|---|---|
| **Supabase** (free plan is fine) | **Yes** | Database, login, file storage, orders, admin panel | [supabase.com](https://supabase.com) |
| **Vercel** (free plan is fine) | **Yes** (to go online) | Hosting at a public URL | [vercel.com](https://vercel.com) |
| **Razorpay** | Recommended | Online payments (UPI, cards, net banking). Without it, customers pay by UPI and you record payments manually. | [razorpay.com](https://razorpay.com) |
| **Razorpay webhook** | Recommended | Confirms payments even if a customer closes the browser mid-payment | Razorpay Dashboard → Webhooks |
| **Custom SMTP for Supabase emails** | Strongly recommended for launch | Supabase’s built-in email sender is heavily rate-limited (only a few emails per hour), so sign-up confirmations and password resets can stall. Use any SMTP provider (e.g. Resend, Brevo, Zoho). | Supabase → Authentication → Emails → SMTP |
| **Your domain** | Optional | `www.yourstudio.com` instead of `*.vercel.app` | Vercel → Domains |
| **Business email** | Placeholder | Currently shows `hello@your-domain.com` | Admin → Website content |
| **Social media links** | Optional | Instagram, Facebook, YouTube, LinkedIn, X, Behance icons appear once you add URLs | Admin → Website content |
| **Prices** | Your decision | Set service starting prices and package prices | Admin → Services / Packages |
| **Real portfolio & reviews** | When available | Replace demo projects and placeholder testimonials | Admin → Portfolio / Website content |
| **Legal review** | Recommended | The policies are sensible templates, not legal advice | `app/privacy`, `app/terms`, `app/refund-policy` |

**Not included** (can be added later): automatic email/WhatsApp notifications to you or customers when an order is placed or its status changes (you see new orders in the admin panel, with a badge count), GST invoices, and CAPTCHA (spam is handled by honeypot + timing + rate limits; Cloudflare Turnstile can be added if spam ever appears).

---

## 3. Step-by-step setup

You need a free GitHub account and [Node.js 20+](https://nodejs.org) only if you want to run it on your own computer first.

### Step 1 — Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**. Choose region **Mumbai (ap-south-1)** for Indian customers. Save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), click **Run**. It should finish with “Success”.
3. New query again → paste [`supabase/seed.sql`](supabase/seed.sql) → **Run**. This adds the 6 categories, 32 services, 3 packages, demo portfolio, placeholder testimonials, FAQs and website text.
4. **Project Settings → API**: copy the **Project URL**, the **anon / publishable** key and the **service_role / secret** key. Keep the service key private.
5. **Authentication → URL Configuration**:
   - *Site URL*: your live address, e.g. `https://abdur-rahman-studio.vercel.app` (update it later if you add a domain).
   - *Redirect URLs*: add `https://YOUR-SITE/auth/callback` and `http://localhost:3000/auth/callback`.
6. (Recommended) **Authentication → Emails → SMTP Settings**: connect your email provider so confirmation and reset emails are delivered reliably.

### Step 2 — Get Razorpay test keys (optional but recommended)

1. Sign up at [razorpay.com](https://razorpay.com). You can use **Test Mode** immediately, before KYC.
2. Dashboard → **Account & Settings → API Keys** → generate **Test** keys (`rzp_test_…`). Copy the Key ID and Key Secret.
3. **Account & Settings → Payment capture**: make sure **automatic capture** is on (default for new accounts).
4. The webhook is set up in Step 4, once your site has a URL.

### Step 3 — Put the code on GitHub

1. Create a new **private** repository on GitHub.
2. Upload the contents of this folder (drag-and-drop works on github.com, or use `git push`). Do **not** upload any `.env` file.

### Step 4 — Deploy on Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import your GitHub repository. Framework is detected as **Next.js**.
2. Under **Environment Variables**, add every variable from [`.env.example`](.env.example):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://YOUR-PROJECT.vercel.app` (no trailing slash) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role / secret key |
   | `RAZORPAY_KEY_ID` | `rzp_test_…` |
   | `RAZORPAY_KEY_SECRET` | Razorpay key secret |
   | `RAZORPAY_WEBHOOK_SECRET` | any long random text — you’ll type the same text in Razorpay |
   | `IP_HASH_SALT` | any long random text |

3. Click **Deploy**. When it finishes you get your live URL.
4. If the URL differs from what you entered, update `NEXT_PUBLIC_SITE_URL` in Vercel and the Site URL / Redirect URL in Supabase, then **Redeploy**.
5. Razorpay → **Webhooks → Add New Webhook**:
   - URL: `https://YOUR-SITE/api/payments/webhook`
   - Secret: the same value as `RAZORPAY_WEBHOOK_SECRET`
   - Events: `payment.captured`, `payment.authorized`, `payment.failed`, `order.paid`

### Step 5 — Make yourself the admin

1. On your live site, click **Login → Create an account** and register with your email. Confirm the email.
2. In Supabase **SQL Editor**, run (with your email):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Sign out and back in. You’ll see **Admin panel** in your dashboard. Only accounts with the `admin` role can open `/admin` — the app has no button to grant it, by design.

### Step 6 — Personalise

Admin → **Website content** (business email, social links, hero text) → **Services** and **Packages** (prices) → **Portfolio** (real work) → **Website content → Testimonials** (real reviews).

### Run on your own computer (optional)

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # open http://localhost:3000
```

Without any environment variables the site still runs in **preview mode** (catalogue from `lib/catalog-data.ts`, ordering falls back to WhatsApp, dashboards show “Setup required”).

---

## 4. Test the critical flows

Do this once in Razorpay **test mode** before announcing the site.

1. **Order as a guest:** Services → *Order Now* → finish all 6 steps with a photo attached → you land on the confirmation page with an order number. Bookmark it.
2. **Admin sees it:** `/admin` → the order appears with a badge. Open it, download the reference photo.
3. **Quote & pay:** set a price (e.g. ₹10) → *Save price*. On the customer’s confirmation page click **Pay securely**. In test mode, choose UPI and use the test UPI ID `success@razorpay`, or a test card from [Razorpay’s test card list](https://razorpay.com/docs/payments/payments/test-card-details/).
4. **Verified payment:** the page shows *Payment successful* and a receipt. In admin, the order is **Paid** and the timeline shows the receipt number. Razorpay Dashboard → Webhooks shows a successful delivery.
5. **Status & delivery:** change status to *In Progress* with a note → upload a deliverable → set *Completed*. The customer sees each step and can download the file.
6. **Account linking:** register with the same email used for the guest order → after confirming, the order appears under *My Orders*.
7. **Support:** customer sends a support request → admin replies in *Messages → Support* → customer sees the reply.
8. **Direct UPI:** on another order, use *Record a direct UPI / bank payment* → a receipt is issued.
9. **Security spot-check:** signed in as a normal customer, open `/admin` → you are redirected away. Open another customer’s order URL → “not found”.
10. **Mobile:** repeat steps 1 and 3 on an Android phone and an iPhone.

---

## 5. Going live with real payments

1. Complete Razorpay KYC and activation.
2. Generate **Live** API keys (`rzp_live_…`) and create the webhook again in **Live mode** (webhooks are separate for test and live).
3. Replace `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in Vercel → **Redeploy**.
4. The “TEST MODE” label disappears automatically. Make one small real payment and refund it from the Razorpay Dashboard to confirm.

---

## 6. Everyday admin tasks

- **New order arrives:** Admin → Orders (badge shows new ones). Review the brief → set the price if it isn’t fixed → change status to *Confirmed*.
- **Customer paid by UPI directly:** check your UPI app first, then on the order use *Record a direct UPI / bank payment* with the UTR / transaction number.
- **Deliver work:** upload files under *Upload completed project files* (up to 50 MB each), set status to *Ready for Review* or *Completed*.
- **Refunds:** issue them from the Razorpay Dashboard, then note them on the order.
- **Prices:** Admin → Services (per-service “starting from”) and Packages (Basic / Standard / Premium). If a package has a price, new orders on that package use it as the amount automatically; otherwise you set a quote per order.

---

## 7. Project structure

```
app/
  page.tsx, services/, pricing/, portfolio/, contact/, faq/, track/      public pages
  order/ , order/confirmation/[orderNumber]/                              ordering
  (auth)/login, register, forgot-password, reset-password, auth/callback  authentication
  dashboard/                                                              customer dashboard (+ actions.ts)
  admin/                                                                  admin panel (+ actions.ts)
  receipt/[paymentId]/                                                    printable receipts
  api/orders, api/orders/[id]/files, api/files/[fileId]                   orders & secure files
  api/payments/create-order, verify, webhook                              Razorpay
  api/contact, api/track                                                  contact form, tracking
components/   ui/ layout/ home/ services/ pricing/ portfolio/ order/ payments/ dashboard/ admin/ views/ auth/
lib/
  catalog-data.ts   starting catalogue (source of seed.sql + preview mode)
  validation.ts     all input validation (zod)
  order-utils.ts    order IDs, statuses, money helpers
  razorpay*.ts      Razorpay API + signature verification
  order-access.ts   who may see an order (owner / admin / guest link)
  supabase/         browser, server, admin and middleware clients
supabase/
  schema.sql        tables, row-level security, storage buckets, payment functions
  seed.sql          starter content (generated by scripts/generate-seed.ts)
  tests/            database security tests
tests/              unit tests (signatures, order IDs, money, files, reports)
middleware.ts       session refresh + login protection for /dashboard and /admin
```

The colour palette, fonts and component styles live in `app/globals.css` (`:root` for dark, `[data-theme="light"]` for light mode).

---

## 8. Security design

- **Row-Level Security on every table.** Customers can only read their own orders, files, payments and tickets. Only admins can change orders, prices or content. Customers cannot change their own role (column-level privileges).
- **Admin access** is checked in middleware (signed in), in `app/admin/layout.tsx` (role), in every server action, and again by database policies.
- **Payments:** the amount is computed on the server from the database; the Razorpay signature is verified with HMAC-SHA256 using a constant-time comparison; the payment is then fetched from Razorpay’s API to confirm order ID, amount, currency and status; only then does the `mark_payment_paid` database function (callable **only** by the server) update the order — idempotently, so the browser and webhook can both report the same payment safely. Webhooks are signature-checked and de-duplicated.
- **Secret keys** (`SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) are only read in server code marked `server-only`; they never reach the browser.
- **Files** go to a **private** storage bucket via one-time signed upload URLs (type and size limits enforced by the bucket too). Downloads go through `/api/files/…`, which checks access and issues a 2-minute signed link.
- **Guest orders** get a 256-bit secret link; only its SHA-256 hash is stored.
- **Spam protection:** honeypot field, minimum fill time, and per-IP rate limits (IP addresses are stored only as salted hashes).
- **Headers:** HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.

---

## 9. Automated tests

```bash
npm test
```

Runs unit tests for Razorpay signature verification (genuine, tampered, forged, truncated), webhook signatures, order-number format/uniqueness, access tokens, money rounding, India-time revenue reports, file-name sanitising and path safety.

**Database tests** (`supabase/tests/rls_test.sql`) check row-level security and the payment functions: customers can’t see each other’s data, can’t promote themselves, can’t change prices, can’t mark payments paid; admins can; payments are counted exactly once; guest orders are claimed correctly. To run them against a local PostgreSQL 15+:

```bash
createdb ards_test
psql -d ards_test -f supabase/tests/supabase_stub.sql   # minimal stand-in for Supabase's auth/storage schemas
psql -d ards_test -f supabase/schema.sql
psql -d ards_test -f supabase/seed.sql
psql -d ards_test -f supabase/tests/rls_test.sql        # ends with: ALL RLS & PAYMENT TESTS PASSED
```

Regenerate `seed.sql` after editing `lib/catalog-data.ts`:

```bash
node --experimental-strip-types scripts/generate-seed.ts > supabase/seed.sql
```

---

## 10. What was verified, and what to check on first build

This code was written in an environment that could not download npm packages, so `npm install && npm run build` has **not** been run on it yet. Verified so far:

- `schema.sql` and `seed.sql` run cleanly (twice, to prove they can be re-run) on PostgreSQL 16, and all database security and payment tests pass.
- All 15 unit tests pass (`npm test`), and the validation rules were exercised with valid and invalid orders.
- The whole app type-checks with TypeScript against simplified framework type definitions (catching broken imports, wrong props and undefined names).
- Every public page was bundled and rendered with React 19 in a real browser — desktop and mobile, dark and light — with no runtime errors and no horizontal scrolling on a 390 px-wide phone.

**On your first build**, Vercel (or `npm run build`) runs a full type-check against the real Next.js, Supabase and Framer Motion types. If it reports an error, it will point to a file and line; such issues are usually a one-line typing fix. Then work through the checklist in [section 4](#4-test-the-critical-flows) — that’s the first time the live integrations (Supabase Auth emails, Storage uploads, Razorpay Checkout and webhooks) run end to end.
