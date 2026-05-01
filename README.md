# Copper

AI receptionist for owner-operated home services businesses (HVAC, plumbing, electrical). Replaces missed calls, slow lead response, and forgotten review requests with always-on automation. Multi-tenant from day one — every customer is provisioned through the same script.

Built against [`flagship-v1-prd.md`](./flagship-v1-prd.md). V1 success criteria:

- New tenant from signed onboarding form to live phone number in **< 2 hours of operator time**
- AI agent books **≥ 60 %** of missed calls in pilot
- Review requests fire within 2 hours of job completion
- Owner sees value daily via SMS digest + dashboard

---

## Tech stack

| Layer | Choice |
|---|---|
| Voice agent | Vapi |
| Telephony / SMS | Twilio |
| Backend | Next.js 16 (App Router) + TypeScript route handlers |
| DB | Supabase Postgres + RLS |
| ORM / migrations | Drizzle |
| Frontend | Next.js + Tailwind + shadcn/ui |
| Booking | Cal.com (managed, v2 API) |
| Background jobs | Inngest |
| LLM (summaries) | OpenRouter via OpenAI SDK (default: `anthropic/claude-sonnet-4.5`); Vapi handles in-call model separately |
| Payments | Stripe (Checkout + customer portal) |
| Hosting | Vercel + Supabase + Inngest Cloud |
| Errors | Sentry (planned, not yet wired) |
| Logs | Vercel runtime logs + in-app `events` table |

---

## Architecture at a glance

```
Customer phone ─► Twilio number ─► Vapi assistant
                                        │
                                        ▼
                       /api/webhooks/vapi/{business_id}
                                        │
                       ┌────────────────┼─────────────────┐
                       ▼                ▼                 ▼
                  tool-calls    end-of-call-report   status-update
                       │                │                 │
                       │                │                 ▼
                       │                │         missed-call SMS
                       │                ▼
                       │     OpenRouter summarize → calls row
                       ▼
              book_appointment ─► Cal.com booking ─► customer SMS + owner SMS
                                                          │
                                                          ▼
                                              Inngest "appointment/booked"
                                                          │
                                                          ▼
                                          schedule review request (end_at + 2h)
```

Other entry points:

- `/api/webhooks/lead/{business_id}` — web form lead → fires Inngest `lead/web-form-submitted` → outbound Vapi call
- `/api/webhooks/twilio/sms/{business_id}` — inbound SMS persisted (signature-verified)
- `/api/webhooks/stripe` — subscription lifecycle → DB
- `/api/inngest` — Inngest function registry (cron + event handlers)
- `/r/{token}` — tracked review redirect → marks clicked → Google review URL

---

## Repository layout

```
app/
  api/
    inngest/route.ts                          # Inngest serve endpoint
    webhooks/
      vapi/[business_id]/route.ts             # voice events + tool calls
      twilio/sms/[business_id]/route.ts       # inbound SMS
      lead/[business_id]/route.ts             # signed web-form lead
      stripe/route.ts                         # Stripe events
  dashboard/                                  # auth-gated SPA
    layout.tsx, page.tsx (Today)
    calls/{page.tsx,[id]/page.tsx}
    bookings/page.tsx
    reviews/page.tsx
    settings/{page.tsx,actions.ts}
    billing/{page.tsx,actions.ts}
  onboard/                                    # public form + thanks page
  r/[token]/route.ts                          # tracked review redirect
  account-pending/page.tsx                    # auth user not yet linked

lib/
  db/{index.ts,schema.ts,queries.ts,migrations/}   # Drizzle
  voice/{types.ts,prompt-template.ts,tools.ts,tool-handlers.ts,vapi.ts,deploy.ts}
  telephony/twilio.ts                              # SMS send + client
  booking/cal.ts                                   # Cal.com v2 client
  ai/llm.ts                                        # call summarization (OpenRouter)
  jobs/{client.ts,functions.ts}                    # Inngest
  billing/stripe.ts                                # Stripe client
  provisioning/{index.ts,twilio.ts}                # tenant orchestrator
  env.ts                                           # Zod-validated env (lazy)
  format.ts                                        # date / phone / duration helpers

components/
  dashboard/{sidebar.tsx,badges.tsx,settings-form.tsx}
  onboarding/onboarding-form.tsx
  ui/                                              # shadcn primitives

scripts/
  seed-test-tenant.ts                              # bun db:seed
  provision-tenant.ts                              # bun provision <id>
```

---

## Local development

### Prerequisites

- [Bun](https://bun.com) 1.3+
- Supabase project (free tier works)
- Optional but needed for full E2E: Vapi, Twilio, OpenRouter, Cal.com, Stripe, Inngest accounts

### 1. Install + env

```bash
bun install
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` (Supabase → Project Settings → Database → "Direct connection" string). Everything else is optional and can be filled in as you wire each integration.

### 2. Migrate the database

```bash
bun db:migrate
```

This applies all migrations under `lib/db/migrations/`, including RLS policies on every table.

### 3. Seed a test tenant (optional)

```bash
bun db:seed
```

Inserts "Tenant Zero HVAC" with sample KB. Prints the `business_id` and webhook URLs.

### 4. Run the dev server

```bash
bun dev
```

For Inngest functions to run locally, also start the Inngest dev server:

```bash
bunx inngest-cli@latest dev
```

It auto-discovers functions at `http://localhost:3000/api/inngest`.

### 5. Tunnel for webhooks (when testing real voice/SMS/Stripe)

Vapi, Twilio, and Stripe push webhooks. From a second terminal:

```bash
ngrok http 3000
```

Set `APP_URL=https://your-tunnel.ngrok.app` in `.env.local` and restart `bun dev`. Then point provider webhooks at the tunneled URL.

### 6. Provision your test tenant

Once Vapi + Twilio keys are set:

```bash
bun provision <business_id> --area-code 415
```

This buys a Twilio number, registers it with Vapi, deploys the assistant, optionally creates a Stripe customer, and links phone → assistant. Idempotent — safe to re-run.

### 7. Link your auth user (white-glove step)

V1 is white-glove, so the `owner_user_id` link is manual:

```sql
update businesses
set owner_user_id = (select id from auth.users where email = '<your-email>')
where id = '<business_id>';

update businesses set status = 'live' where id = '<business_id>';
```

You can then sign in at `/auth/login` and land in `/dashboard`.

---

## Dev gotchas

Things that bit me during the first end-to-end run. Read before debugging.

### Supabase direct connection is IPv6-only on the free tier
The "Direct connection" string at `db.<ref>.supabase.co:5432` won't connect from most home networks. Use the **Session pooler** string instead (looks like `postgres://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres`). Username is `postgres.<project_ref>`, not bare `postgres`. Works for both migrations and runtime; switch to the transaction pooler later only if you need it.

### `NEXT_PUBLIC_*` env vars are baked into client JS at dev-server start
If you change `.env.local` (Supabase URL, key, etc.) while `bun dev` is running, the browser still has the old (or undefined) values. Symptom: `supabase.auth.signUp()` does nothing, no network request, console silent. Fix: Ctrl-C `bun dev`, restart, hard-refresh browser.

### Next.js 16 blocks cross-origin dev requests by default
When you tunnel `localhost:3000` through ngrok, Next.js refuses to serve `_next/*` to the ngrok host, which means React bundles never load and forms submit as default HTML GETs. Fix: add the ngrok host to `allowedDevOrigins` in `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  allowedDevOrigins: ["<your-tunnel>.ngrok-free.app"],
};
```

### ngrok free tier reassigns subdomain on every restart
Each restart breaks three things at once: `allowedDevOrigins` in `next.config.ts`, `APP_URL` in `.env.local`, and the webhook URL baked into the Vapi assistant. After updating the first two, **re-run `bun provision <id>`** to redeploy the assistant with the new URL.

To avoid the dance entirely, claim a static domain in the ngrok dashboard (free tier allows one) and start ngrok with `ngrok http --url=<your-stable>.ngrok-free.app 3000`. Then nothing ever changes.

### Supabase auth blocks unknown redirect URLs
The signup form's `emailRedirectTo` must be in Supabase's allowlist. Set both **Site URL** and **Redirect URLs** in Supabase → Authentication → URL Configuration to your ngrok URL (`https://<tunnel>.ngrok-free.app` and `https://<tunnel>.ngrok-free.app/**`). Update each time the ngrok URL changes (or use a static domain).

### Vapi voices and model IDs change
Vapi rotates their voice catalog and uses dated model IDs. If `bun provision` fails with `voice not supported` or `model.model must be one of...`, look at `lib/voice/deploy.ts` and swap to a current value:
- Voices that work today: `Elliot`, `Kylie`, `Rohan`, `Hana`, `Lily`. Authoritative list: <https://docs.vapi.ai/providers/voice/vapi-voices>
- Models need the full dated form: `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, etc. The error message lists every accepted value if you get it wrong.

### Twilio area codes can be out of stock
`bun provision <id> --area-code 415` may fail with "no local numbers available". Try a less-popular area code (510, 408, 650, 334) or drop `--area-code` entirely to fall back to any US local number.

### Empty values in `.env.local` are not the same as unset
`VAPI_API_KEY=` (empty string) is parsed as `""`, not `undefined`. The env loader at `lib/env.ts` cleans empty strings to `undefined` before validating so optional integration keys aren't rejected — keep this in mind if you add new env vars.

### Provisioning script holds the DB open
The `postgres` driver keeps its pool alive after the script completes, so scripts need explicit `process.exit(0)` on success. Both `seed-test-tenant.ts` and `provision-tenant.ts` do this. Any new long-running script should too, or it'll appear to hang.

### Drizzle Kit is its own subprocess
`drizzle-kit migrate` doesn't see env vars from bun's auto-loading because it spawns its own Node process for the config. Hence `drizzle.config.ts` calls `dotenv` directly. Don't remove that.

### Twilio API succeeds but SMS never arrives → A2P 10DLC
If `events` table shows no `sms_failed` rows but your phone never gets the message, look in **Twilio Console → Monitor → Logs → Messaging** — the message will be `undelivered`. US carriers filter unregistered traffic. Fix: register A2P 10DLC (one Brand + one Campaign for the whole platform). Voice and tool invocations work fine without it; only SMS delivery is blocked. Full registration steps in the Production Deployment → Twilio section.

---

## Production deployment

### Supabase

- Create project. Note the URL, publishable key, service role key, and direct DB URL.
- `bun db:migrate` from a CI step or locally pointed at production.
- RLS is enforced — verify with the cross-tenant test (Phase 5 todo).

### Vercel

- Import the repo. Vercel auto-detects Next.js.
- Set every required env var from `.env.example`.
- Important: set `APP_URL` to the deployed origin (e.g., `https://copper.vercel.app`).
- The proxy at `proxy.ts` handles Supabase session refresh — no extra config.

### Inngest Cloud

- Create app, link to GitHub repo or use the deploy URL.
- Set the serve URL to `https://<your-domain>/api/inngest`.
- Sync once; Inngest discovers `outboundLeadCall`, `reviewRequestFlow`, `dailyDigest`, `quoteFollowupReminder`.
- Add `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to Vercel env.

### Vapi

- Create account, copy API key into `VAPI_API_KEY`.
- Optionally set a webhook secret (`VAPI_WEBHOOK_SECRET`) — when set, the webhook handler enforces `x-vapi-secret`.
- Assistants are created automatically by `provisionTenant`. No manual config required.

### Twilio

- Standard account, copy SID + auth token into `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`.
- Set `TWILIO_DEFAULT_FROM_NUMBER` to the Twilio number you want SMS sent *from*. For Tenant Zero, that's the number `provisionTenant` bought. Once you have multiple tenants, you'd switch to per-tenant from-numbers in code (currently a global default).
- Set `TWILIO_MESSAGING_SERVICE_SID` once your A2P 10DLC Brand + Campaign are approved. `provisionTenant` will auto-attach every newly-bought number to this service so SMS clears carrier filtering. Find it at Twilio Console → Messaging → Services → your service → Service SID (`MGxxxx`).
- `provisionTenant` buys numbers and configures their SMS webhook automatically. Vapi configures the voice webhook when the number is registered.

#### A2P 10DLC registration (required for US SMS delivery)

Without registration, US carriers (T-Mobile, Verizon, AT&T) silently filter most SMS from your numbers. The Twilio API call returns 200, the message logs as `undelivered`, and nothing arrives on the recipient's phone. This is the most common cause of "my SMS isn't going through" once everything else looks right.

**Important: A2P is operator-level, not tenant-level.** As the platform, you register **one Brand** (your business) and **one Campaign** (the use case), then attach every customer's Twilio number to that single Campaign. You do not register each customer separately.

**Steps:**

1. **Twilio Console → Messaging → Regulatory Compliance → A2P 10DLC**.
2. **Register a Brand**:
   - Use your real legal entity name and EIN (or SSN for sole prop).
   - Standard Brand: ~$4 + $40 one-time vetting fee. Higher throughput.
   - Sole Prop / low-volume Brand: ~$4, no vetting, lower throughput limits — fine for early stage.
3. **Register a Campaign**:
   - Use Case: **Customer Care** (best fit for the AI receptionist; also acceptable: "Account Notifications").
   - Description: *"AI receptionist sends customers appointment confirmations, missed-call text-backs, and review requests on behalf of small home services businesses. Owners receive per-call summaries and emergency alerts."*
   - Provide all four sample messages — they should match the actual templates the system sends:
     - *"Hey, this is {Business} — sorry we missed you. Our AI assistant just called you back, or reply here and we'll text you."*
     - *"Confirmed — {service} on {date}. {Business} will text before arrival. Reply with questions."*
     - *"EMERGENCY @ {Business}: {summary}. Caller {phone}. Address: {address}."*
     - *"Today: {N} calls, {M} booked ({X}%), {E} emergencies, {R} reviews requested."*
   - Opt-in mechanism: explain that customers initiate by calling the business number (the missed-call text-back is a reply-to-an-implicit-opt-in pattern). For web-form leads, the opt-in is the form submission.
   - Opt-out: standard `STOP` keyword (handled by Twilio automatically).
4. **Attach Twilio numbers to the Campaign**: every number you provision (`+13345649614`, plus future tenants) needs to be linked. New numbers must be attached *after* purchase — `provisionTenant` doesn't do this automatically. Do it from the Twilio Console under Messaging → Senders → Phone Numbers.
5. **Wait for approval**: typically 1-3 business days for the Brand, another 1-2 days for the Campaign.

**Cost**: ~$2/mo per campaign + per-message carrier fees (fractions of a cent). Total carrier deposits vary.

**While you wait**: voice flows, tool invocations, Cal.com bookings, dashboard updates — all work fine. Only actual SMS delivery is blocked. Use the `events` table to verify the system *would have* sent SMS if approval were complete.

**Throughput**: a single Campaign covers all your customer numbers. Per-second message limits scale with Brand vetting tier (Sole Prop < Standard < Verified), not with number count. If you outgrow throughput, register a higher tier — not more campaigns.

### Cal.com

- Create account or use a self-hosted instance. Note the API key.
- Each tenant needs an event type ID stored in `businesses.cal_com_event_type_id`. The provisioning script does not auto-create event types yet — set this manually until that flow is built.

### Stripe

- Create two prices in the Stripe dashboard:
  - One-time setup fee → `STRIPE_PRICE_SETUP`
  - Recurring monthly subscription → `STRIPE_PRICE_MRR`
- Add a webhook endpoint pointing at `https://<your-domain>/api/webhooks/stripe`. Subscribe to: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### OpenRouter

- API key into `OPENROUTER_API_KEY`. Used only for offline call summarization via the OpenAI-compatible endpoint. Vapi runs the in-call model itself with credentials configured directly in the Vapi dashboard.
- Default model is `anthropic/claude-sonnet-4.5`. Override by editing `SUMMARY_MODEL` in `lib/ai/llm.ts` — any OpenRouter model id works (e.g. `openai/gpt-4o-mini`, `anthropic/claude-haiku-4.5`).

---

## What's built

### Foundations
- [x] Drizzle schema for 8 tables (businesses, knowledge_base, contacts, calls, messages, appointments, review_requests, events) with 12 enums
- [x] RLS policies on every table, scoped via `businesses.owner_user_id = auth.uid()`
- [x] Lazy Zod env loader — required keys validated on first access, integration keys optional
- [x] Lazy Drizzle client — connects on first query, doesn't break `next build` without env

### Inbound voice (Flow 1)
- [x] Vapi webhook handler with optional secret verification
- [x] `tool-calls` dispatched to handlers and returned synchronously
- [x] `end-of-call-report` upserts `calls` row, persists transcript + recording URL
- [x] LLM call summarization via OpenRouter (intent, outcome, isEmergency, ownerLine) via tool calling
- [x] Per-call SMS digest line to owner at end-of-call
- [x] Missed-call text-back fired on `status-update: in-progress` (idempotent per Vapi call ID)

### AI tools (called mid-call)
- [x] `get_available_slots` → Cal.com slot lookup
- [x] `book_appointment` → real Cal.com booking + appointment row + customer SMS + owner SMS, fires `appointment/booked` Inngest event
- [x] `lookup_existing_customer` → contacts table query
- [x] `send_emergency_alert` → owner SMS
- [x] `send_quote_followup` → fires `tool/quote-followup` Inngest event

### Outbound voice (Flow 2 — speed-to-lead)
- [x] Public web-form lead webhook with HMAC-SHA256 signature verification
- [x] Inngest `outboundLeadCall` function fires Vapi outbound call within seconds
- [x] Single-attempt only — multi-attempt retry (PRD Flow 2 step 5) deferred to V1.5

### SMS
- [x] Outbound SMS via Twilio with DB persistence in `messages`
- [x] Inbound SMS webhook with HMAC-SHA1 signature verification
- [x] Idempotent on `MessageSid`

### Reviews (Flow 3)
- [x] Inngest `reviewRequestFlow` triggered by `appointment/booked`
- [x] Sleeps until `end_at + 2h`, sends tracked SMS
- [x] 48h wait → nudge if unclicked → 48h wait → mark complete
- [x] Tracked redirect at `/r/{token}` increments `clicked` and 302s to `business.googleReviewUrl`

### Owner notifications
- [x] Per-call summary SMS at end-of-call
- [x] Daily digest SMS at 6 PM local time per tenant (timezone-aware via Postgres `AT TIME ZONE`)
- [x] Emergency alert SMS

### Dashboard
- [x] Auth-gated layout with sidebar nav
- [x] Today page (calls / booked / conversion / emergencies / reviews requested)
- [x] Calls list + detail (transcript, recording playback, summary, linked appointment)
- [x] Bookings list (upcoming appointments)
- [x] Reviews list (pending / sent / clicked / completed)
- [x] Settings page: business info, hours grid editor, KB JSON sections, voice config; save redeploys Vapi assistant
- [x] Billing page: subscription status, Stripe checkout, Stripe customer portal

### Onboarding (self-serve)
- [x] Public form at `/onboard` capturing all PRD §7 fields
- [x] **AI-drafted KB from website URL** — owner pastes URL → server fetches → OpenRouter returns structured services / FAQs / brand voice → form pre-fills
- [x] Submission creates pending business + KB rows, then creates Stripe customer + Checkout session, redirects to Stripe
- [x] `/onboard/setup/[id]` wait page with client-side polling, redirects to `/dashboard` when status flips to `live`
- [x] Stripe webhook (`flow: "new_tenant"`) creates Supabase auth user via `inviteUserByEmail` (magic link), links `owner_user_id`, fires Inngest `tenant/provision-needed`
- [x] No human required — card swipe to working AI in ~30-60s

### Provisioning
- [x] `provisionTenant(businessId)` orchestrator — idempotent, safe to re-run
- [x] 7 steps, each env-gated and soft-failing: `twilio-number` → `a2p-attach` → `vapi-phone-number` → `cal-event-type` → `vapi-assistant` → `stripe-customer` → `link-phone-to-assistant`
- [x] CLI: `bun provision <business_id> [--area-code 415]` (still useful for re-deploying after `APP_URL` changes or manual repair)
- [x] Inngest function `tenantProvisioning` runs the orchestrator on payment success and flips `status` to `live`

### Billing
- [x] Self-serve Checkout: `createSelfServeCheckout` (subscription only, $500/mo, no setup fee)
- [x] Existing-tenant activation Checkout: `createCheckoutSession` (optional setup fee + MRR, used from `/dashboard/billing`)
- [x] Customer portal for self-service card / invoice management
- [x] Webhook handles checkout completion, subscription lifecycle, invoice events

### Schema migrations
- [x] `0000_init.sql` — initial 8 tables + RLS
- [x] `0001_add_vapi_phone_and_google_review.sql`
- [x] `0002_add_stripe_fields.sql`

---

## What's deferred (Phase 5 + V1.5)

- [ ] Sentry wiring in webhooks + actions
- [ ] Cross-tenant RLS test (script that creates two tenants and verifies isolation)
- [ ] "Ring owner cell first" voice routing (currently goes straight to Vapi)
- [ ] Multi-attempt outbound retry for speed-to-lead (PRD Flow 2 step 5)
- [ ] Per-attempt cold-mark logic
- [ ] Owner-friendly editors for services / FAQs (currently JSON textareas)
- [ ] Tenant-zero polish pass
- [ ] Optional white-glove tier (`/book-setup` page with Calendly + one-time setup fee). Revisit after first ~10 self-serve customers.

---

## End-to-end testing checklist

The first section is the **self-serve smoke test** — the primary flow new customers will hit at launch. Run that one whenever the onboarding/checkout/provisioning code changes. The rest of the checklist contains per-feature tests against an already-provisioned tenant.

### 0. Self-serve onboarding smoke test (the launch flow)

This validates that an unauthenticated visitor can go from `/onboard` to a working AI receptionist without any human intervention.

**Prerequisites:**
- All env keys filled in `.env.local`: Supabase + DATABASE_URL + Vapi + Twilio + Cal.com + Stripe + OpenRouter + Inngest.
- `STRIPE_PRICE_MRR` set to a recurring price ($500/mo). `STRIPE_PRICE_SETUP` left empty (self-serve has no setup fee).
- `TWILIO_MESSAGING_SERVICE_SID` set so new numbers auto-attach to your A2P 10DLC Campaign.
- Stripe webhook endpoint configured to point at `https://<your-tunnel>/api/webhooks/stripe`.
- Cal.com account is connected to a Google Calendar so booking has real availability.
- Three terminals running: `bun dev`, `bun tunnel`, `bunx inngest-cli@latest dev`.

**Steps:**

1. Open an **incognito window** (so you're not signed in as the operator). Visit `https://<your-tunnel>.ngrok-free.dev/onboard`.
2. **Test the AI-KB drafter**: paste a real HVAC business URL, click **Draft from URL**. Within a few seconds, services + FAQs + brand voice notes should populate the form. Edit if needed.
3. Fill the rest of the form: business name, owner name, owner email (use a real email you can check), owner cell phone (use a real number Twilio can text), timezone, hours, ZIPs.
4. Click **Submit & pay** → redirected to Stripe Checkout.
5. Pay with the test card `4242 4242 4242 4242`, any future expiration, any CVC, any zip.
6. Land on `/onboard/setup/<id>` — the wait page shows "Provisioning…" with a pulsing dot.
7. **Watch the Inngest dev UI** at `localhost:8288`. You should see `tenant-provisioning` start; its steps execute in order: `provision-tenant` (which itself runs all 7 sub-steps) → `mark-live`.
8. Within ~30-60 seconds, the wait page flips to "You're live."
9. Check the email inbox you used. Supabase sent an invitation email with a magic link.
10. Click the magic link → land in `/dashboard` for the new tenant. The Today page should show zeros + the new business name in the header.
11. **Verify the system is wired** by calling the new Twilio number you can find via `select twilio_number from businesses order by created_at desc limit 1`. The AI should pick up with the brand voice you set.
12. Have a brief conversation, request to book an appointment. Cal.com booking should succeed (auto-created event type) and SMS should deliver (A2P-attached number).

**Diagnostic helpers if anything breaks:**

- `events` table for the new business id — every step logs (`onboarding.submitted`, `stripe.checkout.completed`, `tenant.invited`, `tenant.live`, individual `provision.*.failed` if any step blew up).
- Inngest dev UI shows step-level errors with full payloads.
- Stripe Dashboard → Developers → Webhooks → your endpoint → Logs shows webhook delivery.
- Your `bun dev` terminal logs every webhook hit.

If any step fails, the rest of the testing checklist below tests individual features against a tenant that's already provisioned (manually or self-serve).

---

### 1. Auth + dashboard shell
- [ ] Visit `/` — landing page renders
- [ ] Click **Sign in** → land on `/auth/login`
- [ ] Sign in with linked email → redirected to `/dashboard`
- [ ] Sidebar shows all 7 sections; business name appears in header

### 2. Empty-state dashboard
- [ ] **Today** page: shows zeros and "Quiet day so far" card
- [ ] **Calls / Bookings / Reviews**: show empty-state messages, no errors

### 3. Inbound voice
- [ ] Call your tenant's Twilio number from a different phone
- [ ] Vapi answers within 2 rings, plays the first message ("Hi! Thanks for calling …")
- [ ] Within 30 s of pickup, the calling phone receives the missed-call text-back SMS
- [ ] Hang up after a brief conversation
- [ ] Within 30 s, owner phone receives a one-line SMS summary
- [ ] **Calls** page shows the call; click it → transcript, recording playback, summary all render
- [ ] `events` table shows `call.completed`, `missed_call_textback.sent`

### 4. Booking flow (mid-call tool use)
- [ ] Make a second call. Tell the AI: "I need an AC repair, can you check tomorrow morning?"
- [ ] AI calls `get_available_slots` → reads back real slots from Cal.com
- [ ] Pick one, confirm name + phone + address. AI calls `book_appointment`
- [ ] AI confirms verbally; calling phone gets confirmation SMS
- [ ] Owner phone gets booking alert SMS
- [ ] Cal.com dashboard shows the new booking
- [ ] **Bookings** page shows the upcoming appointment
- [ ] Call detail page shows the linked appointment card

### 5. Emergency
- [ ] Make a call describing a "gas smell" or "no heat in winter"
- [ ] AI calls `send_emergency_alert`; owner phone gets EMERGENCY SMS
- [ ] Call detail in dashboard shows red `emergency` badge
- [ ] `summary` text reflects the emergency

### 6. Web form lead → outbound speed-to-lead
- [ ] Submit a JSON POST to `/api/webhooks/lead/{business_id}` with `{ phone, name, service }` (and the HMAC signature header if `INTERNAL_WEBHOOK_SECRET` is set)
- [ ] Within ~60 s, the lead phone rings; Vapi opens with "Hi, this is …"
- [ ] After the call, transcript + summary land in **Calls** as direction = outbound
- [ ] `events` table shows `lead.web_form.received` then `lead.outbound.call_created`

### 7. Review request
- [ ] Manually advance time or shorten the `step.sleepUntil` in `reviewRequestFlow` to test
- [ ] Customer phone receives the review SMS with `https://<domain>/r/<token>`
- [ ] **Reviews** page shows the row in `sent` state with timestamp
- [ ] Open the link from the customer's phone → redirected to `business.googleReviewUrl`
- [ ] **Reviews** page now shows `clicked` state with `clickedAt` timestamp

### 8. Daily digest
- [ ] Wait until 6 PM local for the tenant's timezone (or trigger the cron manually in the Inngest dev UI)
- [ ] Owner phone receives "Today: N calls, M booked (X%), …"
- [ ] Digest link points at `/dashboard`

### 9. Settings save → assistant redeploy
- [ ] Open `/dashboard/settings`
- [ ] Change brand voice notes; click **Save settings**
- [ ] Form shows "Vapi assistant updated (asst_…)"
- [ ] Make a new call — first message and tone reflect the new prompt

### 10. Stripe
- [ ] Open `/dashboard/billing`
- [ ] Click **Activate billing** → redirected to Stripe Checkout
- [ ] Complete payment with test card `4242 4242 4242 4242`
- [ ] Redirected back to `/dashboard/billing?status=success`
- [ ] Stripe webhook fires; `setup_fee_paid_at` populates within seconds
- [ ] Refresh — subscription status shows `active`
- [ ] Click **Manage billing** → Stripe customer portal opens

### 11. Inbound SMS
- [ ] Reply to the missed-call text-back SMS from the calling phone
- [ ] `messages` table gets a new `direction: inbound` row
- [ ] (No automated reply yet — verifying persistence only)

### 12. RLS isolation
- [ ] Create a second auth user + second business in DB
- [ ] Sign in as user A, note URLs/UUIDs
- [ ] Sign in as user B → `/dashboard` only shows user B's data
- [ ] Try direct URL `/dashboard/calls/<user-A-call-id>` → 404 (RLS denies, query returns null)

### 13. Onboarding form
- [ ] Sign out, visit `/onboard`
- [ ] Fill the form (use sample JSON for KB sections)
- [ ] Submit → redirected to `/onboard/thanks`
- [ ] DB has new `businesses` row in `pending` status + linked `knowledge_base` row
- [ ] `events` table shows `onboarding.submitted`

### 14. Provisioning idempotency
- [ ] Run `bun provision <business_id>` for a tenant that's already provisioned
- [ ] Every step shows `·` (skipped) except `vapi-assistant` which always runs (`updated`)
- [ ] No duplicate Twilio numbers, Vapi phone numbers, Stripe customers, or assistants created

---

## Operator runbook

### Diagnose a stuck self-serve onboarding

The self-serve flow (form → Stripe → webhook → Inngest → live) should complete in under a minute. If a customer reports they're stuck on the "Provisioning…" wait page, walk through these in order:

1. **Did Stripe Checkout complete?** Stripe Dashboard → Payments → find their session. Status should be `complete`.
2. **Did the Stripe webhook fire?** Stripe Dashboard → Developers → Webhooks → click the endpoint → Logs. Look for `checkout.session.completed` for the right session id with status 200.
3. **Did the auth user get created?** Check `events` for `tenant.invited` or `tenant.invite.failed`. The latter's `payload.message` says why (most commonly: email already in use from a prior abandoned attempt — manually delete from Supabase Auth and re-fire the webhook from Stripe Dashboard).
4. **Did Inngest run `tenant-provisioning`?** Inngest dashboard (or local dev UI) → Functions → tenant-provisioning. The run will show step-by-step results. A failure throws `NonRetriableError` with the failed step name.
5. **If a specific provisioning step failed**, look in `events` for `provision.<step>.failed` with the underlying error.

Most-common failure modes and fixes:
- `twilio-number` failed with "no local numbers in area code" → the customer didn't specify an area code or it's out of stock. Manually run `bun provision <id> --area-code <other>` after the customer-supplied one fails.
- `cal-event-type` failed → Cal.com API key invalid or hit rate limit. Re-run `bun provision <id>`.
- `a2p-attach` failed → Messaging Service SID wrong or number ineligible. Skip via Twilio Console manual attach, then re-run provision.
- `vapi-assistant` failed → usually means a model or voice ID Vapi rotated out. Edit `lib/voice/deploy.ts` and re-run provision.

### Manually re-fire provisioning for a stuck tenant

```
bun provision <business_id>
```
Idempotent. Skips every step that's already done; re-tries failed steps.

If the customer's auth user got created but `status` is still `pending`, fire a manual Inngest event from the dashboard or just run the script and then:

```sql
update businesses set status = 'live' where id = '<business_id>';
```

### Diagnose a missing call

- Check `events` table filtered by `business_id` and recent `created_at`. Look for `vapi.status-update.*`, `call.completed`, errors.
- Vercel logs for the Vapi webhook route — request bodies are visible.
- Vapi dashboard for the assistant's call log.

### Refresh webhook URLs after a domain change

- Update `APP_URL` in Vercel env.
- For each tenant: `bun provision <business_id>` re-deploys the assistant with the new server URL. SMS webhook URLs need a one-off re-set:

```ts
// in a one-off script
await refreshNumberWebhooks({ businessId, twilioSid: business.twilioSubaccountSid });
```

### Cancel a tenant

- Cancel their Stripe subscription (customer portal or Stripe dashboard).
- `update businesses set status = 'paused' where id = '...';`
- Optionally release the Twilio number and delete the Vapi assistant.

---

## Open questions / decisions to revisit

- **Voice provider**: Vapi for V1, but evaluate Retell if voice quality complaints come in.
- **Multi-attempt retries** for outbound speed-to-lead — needed once we see real lead-form traffic.
- **Subaccount-per-tenant in Twilio** — defer until we hit billing or isolation needs.
- **Self-service onboarding** — V1 is white-glove. Architecture supports flipping the switch.

See [`flagship-v1-prd.md`](./flagship-v1-prd.md) §13 for the full open-decision list.
