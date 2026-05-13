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
| Owner email | Resend (optional — owner notifications no-op if unconfigured) |
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
- `/api/webhooks/twilio/sms/{business_id}` — inbound SMS persisted (signature-verified) → fires Inngest `sms/inbound-received` → AI reply via Twilio
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

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and the two database URLs from Supabase → Project Settings → Database:
- `DATABASE_URL` → **Transaction pooler** string (port 6543, with `?pgbouncer=true` appended). The app's runtime queries go through this.
- `DIRECT_URL` → **Direct connection** or **Session pooler** string (port 5432). Used only by drizzle-kit for migrations. If you omit it, drizzle-kit falls back to `DATABASE_URL` and migrations will fail with a prepared-statement error.

Everything else is optional and can be filled in as you wire each integration.

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

### Two database URLs: transaction pooler for runtime, direct/session for migrations
You need both `DATABASE_URL` and `DIRECT_URL` configured. They serve different roles:
- `DATABASE_URL` → **Transaction pooler** (port 6543, append `?pgbouncer=true`). The app uses this for every query at runtime. Connection pooling is per-transaction so hundreds of concurrent requests share a small physical pool. Required for serverless / Next.js — without it you'll hit `EMAXCONNSESSION` ("max clients reached in session mode") as soon as parallel queries on the dashboard pile up.
- `DIRECT_URL` → **Direct connection** (port 5432 at `db.<ref>.supabase.co`) or **Session pooler** (port 5432 on the pooler host). `drizzle-kit` (migrations / generate / studio) needs prepared statements, which the transaction pooler strips. If `DIRECT_URL` is unset, `drizzle.config.ts` falls back to `DATABASE_URL` and migrations break.

The direct connection at `db.<ref>.supabase.co:5432` is IPv6-only on the Supabase free tier and won't reach from most home networks — in that case use the **Session pooler** string (`postgres://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres`) for `DIRECT_URL`. Username is `postgres.<project_ref>`, not bare `postgres`.

### `EMAXCONNSESSION` / "max clients reached in session mode"
Symptom: queries on `/dashboard` start failing with `(EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15`. Cause: `DATABASE_URL` points at the session pooler (port 5432) instead of the transaction pooler (port 6543). Session mode binds one connection per client for the whole session, capped at 15. Fix: swap to the transaction pooler string per the entry above, restart `bun dev` so the cached postgres client picks it up.

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
Vapi rotates their voice catalog and uses dated model IDs. If `bun provision` or a settings save fails with `voice is part of a legacy voice set` or `model.model must be one of...`, look at `lib/voice/voices.ts` (for the owner-facing picker) and `lib/voice/deploy.ts` (for the model id) and swap to a current value:
- Voices currently offered in the picker: `Elliot`, `Kai`, `Nico`, `Clara`, `Emma`, `Savannah`. The previous set (Spencer, Neha, Harry, Cole, Paige, Hana, Lily, Kylie) was retired on March 1, 2026. Authoritative list: <https://docs.vapi.ai/providers/voice/vapi-voices>
- Models need the full dated form: `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, etc. The error message lists every accepted value if you get it wrong.

### Twilio area codes can be out of stock
`bun provision <id> --area-code 415` may fail with "no local numbers available". Try a less-popular area code (510, 408, 650, 334) or drop `--area-code` entirely to fall back to any US local number.

### Empty values in `.env.local` are not the same as unset
`VAPI_API_KEY=` (empty string) is parsed as `""`, not `undefined`. The env loader at `lib/env.ts` cleans empty strings to `undefined` before validating so optional integration keys aren't rejected — keep this in mind if you add new env vars.

### Production env guards refuse to boot on misconfiguration
When `NODE_ENV=production`, `lib/env.ts` runs cross-field validation that throws on:
- `DEMO_TWILIO_NUMBER` or `DEMO_VAPI_PHONE_NUMBER_ID` being set (would route every customer to a shared demo number)
- `VAPI_WEBHOOK_SECRET` unset (allows webhook spoofing)
- `INTERNAL_WEBHOOK_SECRET` unset (leaves lead webhook unauthenticated)

Symptom: Vercel build succeeds but runtime returns 500 with `Invalid production environment: ...` in the logs. Fix the env vars in Vercel and redeploy. This is intentional — it's the cheapest mistake to make and the most expensive to ship past.

### Provisioning script holds the DB open
The `postgres` driver keeps its pool alive after the script completes, so scripts need explicit `process.exit(0)` on success. Both `seed-test-tenant.ts` and `provision-tenant.ts` do this. Any new long-running script should too, or it'll appear to hang.

### Drizzle Kit is its own subprocess
`drizzle-kit migrate` doesn't see env vars from bun's auto-loading because it spawns its own Node process for the config. Hence `drizzle.config.ts` calls `dotenv` directly. Don't remove that.

### Twilio API succeeds but SMS never arrives → A2P 10DLC
If `events` table shows no `sms_failed` rows but your phone never gets the message, look in **Twilio Console → Monitor → Logs → Messaging** — the message will be `undelivered`. US carriers filter unregistered traffic. Fix: register A2P 10DLC (one Brand + one Campaign for the whole platform). Voice and tool invocations work fine without it; only SMS delivery is blocked. Full registration steps in the Production Deployment → Twilio section.

### Demo provisioning mode (testing onboarding without burning real numbers)
For dev or staging, you can let multiple test signups share a single Twilio + Vapi phone number instead of `provisionTenant` buying a fresh one every time (which would cost ~$1.15/mo per fake signup and hit Vapi's number quota fast).

Set both:
```
DEMO_TWILIO_NUMBER=+13345649614
DEMO_VAPI_PHONE_NUMBER_ID=9bf6f6eb-5602-4529-85c6-3533b8423f1a
```
(Use Tenant Zero's number + Vapi phone-number ID, or any pair you've already provisioned for testing.)

When both are set, `provisionTenant`:
- **Uses the demo number** for steps `twilio-number` and `vapi-phone-number` instead of buying / registering new
- **Skips `a2p-attach`** (the demo number is already attached, or doesn't need it for testing)
- **Still creates a unique Vapi assistant** per tenant — brand voice, prompt, and KB are real
- **Still creates a unique Cal.com event type** per tenant
- **Re-links the demo number to the latest signup's assistant** in `link-phone-to-assistant` (last-write-wins on the inbound voice route)

**Trade-off:** only one tenant at a time can have their AI answer the shared number. If two friends sign up back-to-back, the second signup overwrites the first's voice routing. Their dashboards still work independently; just calling in resolves to whoever signed up most recently.

**Leave both empty in production** — `provisionTenant` falls back to buying real numbers when demo mode is off. The variables are also safe to leave set on a staging Vercel deployment if you want every signup there to share the same number forever.

---

## Production deployment

### Pre-flight checklist

Run through this before flipping DNS at a new domain. Order matters — the env guards refuse to boot the server if any of the first three are missing or wrong.

**Boot-blocking env (required for prod, app refuses to start otherwise):**
- [ ] `VAPI_WEBHOOK_SECRET` set, and the same value pasted into the Vapi assistant's webhook config
- [ ] `INTERNAL_WEBHOOK_SECRET` set (32+ random chars)
- [ ] `DEMO_TWILIO_NUMBER` and `DEMO_VAPI_PHONE_NUMBER_ID` **unset** in the Production scope

**Standard env:**
- [ ] `APP_URL` set to the prod origin (no trailing slash)
- [ ] All Supabase + Stripe + Twilio + Vapi + OpenRouter + Cal.com + Inngest keys set
- [ ] `RESEND_API_KEY` + `NOTIFICATIONS_EMAIL_FROM` (or leave unset — email cleanly no-ops)
- [ ] `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (build-time only)
- [ ] `TWILIO_MESSAGING_SERVICE_SID` once A2P 10DLC is approved
- [ ] `SIGNUP_ALLOWLIST` set to your tester roster while in private beta — see [Private-beta signup gate](#private-beta-signup-gate) below. Clear the var to open public signups.

**Database:**
- [ ] `bun db:migrate` against the prod DB — applies every migration including 0006 (`webhook_events` table for webhook idempotency) and 0007 (`messages.sender` enum + `contacts.ai_paused` boolean for owner replies and pause-AI)

**Provider URLs (re-point from ngrok / staging):**
- [ ] Stripe webhook endpoint → `https://<prod-domain>/api/webhooks/stripe`
- [ ] Supabase Auth → Site URL + Redirect URLs allowlist updated to prod domain
- [ ] Inngest Cloud → serve URL `https://<prod-domain>/api/inngest`, then click Sync
- [ ] For any tenant whose Vapi assistant was provisioned against an ngrok URL: re-run `bun provision <id>` to redeploy with prod URLs

**Smoke test after deploy:**
- [ ] `/` loads with the new landing page; favicon shows the copper "C"
- [ ] Sign up flow end-to-end in incognito with Stripe test card `4242 4242 4242 4242`
- [ ] Place a real call → AI answers → book an appointment → confirm owner SMS + email arrive
- [ ] Throw a deliberate error (or hit a 404) → confirm Sentry receives it
- [ ] POST 13 leads in one hour to `/api/webhooks/lead/<business_id>` → the 13th returns `429` with `Retry-After: 600`
- [ ] Replay any Stripe event twice from the dashboard → second response includes `{duplicate: true}` and doesn't mutate state again

### Production environment guards

The env loader at `lib/env.ts` runs cross-field validation when `NODE_ENV=production`. The server will throw at startup and refuse to serve requests if any of the following are missed — by design, not by accident:

- `DEMO_TWILIO_NUMBER` or `DEMO_VAPI_PHONE_NUMBER_ID` set → would route every new customer to a shared demo number. Treated as fatal.
- `VAPI_WEBHOOK_SECRET` unset → any caller could POST fake end-of-call reports for any tenant.
- `INTERNAL_WEBHOOK_SECRET` unset → the lead webhook would be unauthenticated.

Boot failures show up in Vercel build / runtime logs as `Invalid production environment: ...`. Fix the env in Vercel and redeploy.

### Private-beta signup gate

While A2P 10DLC is still pending or while you're closed-beta testing with a small roster, the codebase has a built-in allowlist gate. The marketing site, legal pages, and login flow stay public — only **new account creation** is restricted.

**Configure**: set `SIGNUP_ALLOWLIST` in Vercel to a comma-separated list of beta-tester emails:

```
SIGNUP_ALLOWLIST=mark.clayton93@gmail.com,tester1@example.com,tester2@example.com
```

Leave the var unset (or empty) and the gate is OFF — anyone can sign up. That's the local-dev default.

**Behavior when the gate is active:**

| Path | What happens |
|---|---|
| `/` and other marketing pages | Public, unchanged. |
| `/privacy`, `/terms`, `/contact` | Public — A2P reviewers can read them. |
| `/auth/login` | Anyone can attempt sign-in. Existing users sign in normally. |
| `/auth/sign-up` (email/password) | Server action checks `SIGNUP_ALLOWLIST` before calling Supabase signUp. Blocked emails redirect to `/auth/waitlist`. |
| `/auth/callback` (Google OAuth) | After OAuth round-trip: if the email isn't on the allowlist AND the user has no existing business in our DB, we sign them out, delete the freshly-created Supabase auth row, and redirect to `/auth/waitlist`. |
| `/onboard/*` | Defense-in-depth: `loadDraftSession` re-checks the allowlist before creating a draft business. Blocked → `/auth/waitlist`. |
| `/dashboard/*` | No gate. Once a user is past onboarding (has a business in our DB), they keep working even if you remove them from the allowlist later. |

**Adding / removing testers**: change the `SIGNUP_ALLOWLIST` env in Vercel and redeploy (or use Vercel's "Update Environment Variables" → "Save and redeploy" flow). Existing tenants are not affected by allowlist changes — to fully revoke access from someone who's already onboarded, delete their auth user from Supabase and their business row from the DB.

**Lifting the gate**: when A2P is approved and you're ready for open signups, clear the `SIGNUP_ALLOWLIST` env var (or remove the var entirely). No code change needed.

The implementation lives in `lib/auth/allowlist.ts`. Three enforcement points: `components/sign-up-form.tsx` (email/password), `app/auth/callback/route.ts` (OAuth), `lib/onboarding/draft-business.ts` (onboarding defense-in-depth).

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
- Sync once; Inngest discovers `outboundLeadCall`, `reviewRequestFlow`, `dailyDigest`, `quoteFollowupReminder`, `tenantProvisioning`, `notifyOwnerAppointmentBooked`, `notifyOwnerEmergency`, `notifyOwnerCallSummary`, `respondToInboundSms`.
- Add `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to Vercel env.

### Vapi

- Create account, copy API key into `VAPI_API_KEY`.
- **Required in production:** `VAPI_WEBHOOK_SECRET` (any 32+ char random string). Paste the same value into the assistant's webhook config under Vapi → Assistants → Server URL → Headers (`x-vapi-secret`). Without it the env guard refuses to boot the server.
- Assistants are created automatically by `provisionTenant`. No manual config required per tenant.

### Twilio

- Standard account, copy SID + auth token into `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`.
- Set `TWILIO_DEFAULT_FROM_NUMBER` to the Twilio number you want SMS sent *from*. For Tenant Zero, that's the number `provisionTenant` bought. Once you have multiple tenants, you'd switch to per-tenant from-numbers in code (currently a global default).
- Set `TWILIO_MESSAGING_SERVICE_SID` once your A2P 10DLC Brand + Campaign are approved. `provisionTenant` will auto-attach every newly-bought number to this service so SMS clears carrier filtering. Find it at Twilio Console → Messaging → Services → your service → Service SID (`MGxxxx`).
- `provisionTenant` buys numbers and configures their SMS webhook automatically. Vapi configures the voice webhook when the number is registered.
- **SMS cost ceiling**: every outbound `sendSms` checks a rolling 30-day count of outbound messages per business. Default cap is 1000 messages / 30 days; override with `SMS_MONTHLY_CAP_PER_BUSINESS`. Hitting the cap throws `SmsQuotaExceededError` and logs an `sms.quota_exceeded` event — protects you from runaway loops draining Twilio credit. Customer-facing booking SMS catches failures so a quota hit never fails a live call.

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

### Resend (owner email notifications)

Optional. Email notifications use Resend; if unconfigured the email channel cleanly skips and SMS still fires.

- Create an account at <https://resend.com> and add your sending domain (we use `notifications.joincopper.io`). Verify the DNS records.
- API key into `RESEND_API_KEY`.
- Set `NOTIFICATIONS_EMAIL_FROM` to a verified sender with a display name, e.g. `Copper <noreply@notifications.joincopper.io>`. The local-part doesn't need to exist as a real mailbox.
- Templates live in `lib/notifications/templates.ts`; the dispatcher in `lib/notifications/owner.ts` respects the per-tenant `notify_channels` JSON column on `businesses`.

### OpenRouter

- API key into `OPENROUTER_API_KEY`. Used only for offline call summarization via the OpenAI-compatible endpoint. Vapi runs the in-call model itself with credentials configured directly in the Vapi dashboard.
- Default model is `anthropic/claude-sonnet-4.5`. Override by editing `SUMMARY_MODEL` in `lib/ai/llm.ts` — any OpenRouter model id works (e.g. `openai/gpt-4o-mini`, `anthropic/claude-haiku-4.5`).

### Sentry (error tracking)

Optional but strongly recommended for production. When unconfigured, all Sentry calls no-op gracefully.

- Create a Next.js project at <https://sentry.io>. Note the DSN under Project Settings → Client Keys.
- **Runtime env (Vercel Production scope):**
  - `SENTRY_DSN` — server-side capture
  - `NEXT_PUBLIC_SENTRY_DSN` — browser capture (usually the same DSN)
- **Build-time env (Vercel Production scope, only used during `next build`):**
  - `SENTRY_ORG` — org slug
  - `SENTRY_PROJECT` — project slug (e.g. `copper`)
  - `SENTRY_AUTH_TOKEN` — create at sentry.io/settings/account/api/auth-tokens with scopes `project:read`, `project:releases`, `org:read`. Used to upload source maps so stack traces are readable.
- The instrumentation lives in `instrumentation.ts` (server + edge) and `instrumentation-client.ts` (browser). Each release is tagged with `VERCEL_GIT_COMMIT_SHA` so issues map to a commit.
- Use `reportError(err, { businessId, tags, extra })` from `lib/observability.ts` when you want to add context to a captured exception. Unhandled errors are captured automatically by the Next.js integration.

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
- [x] `book_appointment` → real Cal.com booking + appointment row + customer SMS (sync); owner notification fans out async via Inngest `appointment/booked`
- [x] `lookup_existing_customer` → contacts table query
- [x] `send_emergency_alert` → fires `emergency/detected` Inngest event for async owner notification (no longer blocks the AI mid-call)
- [x] `send_quote_followup` → fires `tool/quote-followup` Inngest event

### Outbound voice (Flow 2 — speed-to-lead)
- [x] Public web-form lead webhook with HMAC-SHA256 signature verification
- [x] Inngest `outboundLeadCall` function fires Vapi outbound call within seconds
- [x] Single-attempt only — multi-attempt retry (PRD Flow 2 step 5) deferred to V1.5

### SMS
- [x] Outbound SMS via Twilio with DB persistence in `messages`
- [x] Inbound SMS webhook with HMAC-SHA1 signature verification
- [x] Idempotent on `MessageSid`
- [x] **AI-powered SMS replies** — customers can text the AI number in addition to calling. Inbound SMS fires `sms/inbound-received`; `respondToInboundSms` Inngest function loads the KB + last 40 messages of conversation history, asks the LLM (claude-haiku-4.5) for a short reply via a tool call, and sends it back through Twilio.
- [x] Carrier keywords (STOP/HELP/START/etc.) detected and skipped — Twilio's auto-replies handle these at the carrier level.
- [x] LLM-driven owner escalation: when the AI flags a thread (emergency, callback request, cancellation, unanswerable question), an `sms.flagged_for_owner` event is logged and a best-effort owner SMS fires with a snippet of the customer message and the flag reason.
- [x] Per-business Inngest concurrency limit of 5 so a single tenant's text burst doesn't starve others.
- [x] Idempotency on `twilioSid` via `webhook_events` — Inngest retries and Twilio resends can't double-reply.
- [x] **Owner reply from dashboard** — chat-style composer on every conversation page sends SMS as the owner (sender=`owner`), not the AI. Quota-checked like any other SMS.
- [x] **Pause AI per contact** — toggle on the conversation page flips `contacts.ai_paused`. While paused, the AI handler logs `sms.ai_paused_skipped` and returns without generating a reply. Inbound messages still persist; the owner can reply manually.
- [x] **AI vs owner distinction in transcripts** — outbound bubbles render copper for AI replies, dark for owner replies, with a small "AI" / "You" label underneath. Conversation list shows the latest sender too.

### Reviews (Flow 3)
- [x] Inngest `reviewRequestFlow` triggered by `appointment/booked`
- [x] Sleeps until `end_at + 2h`, sends tracked SMS
- [x] 48h wait → nudge if unclicked → 48h wait → mark complete
- [x] Tracked redirect at `/r/{token}` increments `clicked` and 302s to `business.googleReviewUrl`

### Owner notifications
- [x] **Real-time multi-channel alerts** — SMS + HTML email fired from Inngest on `appointment/booked`, `emergency/detected`, and `call/summary-ready`. Non-blocking so they never slow down the AI mid-call.
- [x] **Rich content** — each SMS includes a dashboard deep-link; each email is a styled HTML template with caller info, summary, intent/outcome badges, and a CTA button. Emergency emails have a red banner and a tap-to-dial "Call back now" button.
- [x] **Email via Resend** — optional integration; if `RESEND_API_KEY` is unset, email cleanly skips and SMS still fires.
- [x] **Per-event channel toggles** — owners can independently enable/disable SMS and email for booking, emergency, and call-summary events from `/dashboard/settings`. Default: SMS+email for bookings and emergencies, SMS-only for call summaries.
- [x] Daily digest SMS at 6 PM local time per tenant (timezone-aware via Postgres `AT TIME ZONE`).

### Dashboard
- [x] Auth-gated layout with sidebar nav; **mobile-responsive** — sidebar collapses to a hamburger drawer below `md`; help link `mailto:info@joincopper.io` in header.
- [x] **Today page** — metric cards (calls / booked / conversion / emergencies / reviews) with deltas vs the same window yesterday (↑green / ↓red, inverted for emergencies); **three-column section** with **Upcoming** (next 5 appointments with Today/Tomorrow labels), **Today's calls** (recent calls with summary, intent/outcome badges, click-through to transcript), and **Today's texts** (active SMS conversations with flag indicators and click-through to the conversation); click-to-copy AI receptionist number with "Copied" feedback; friendly empty state with tap-to-call link.
- [x] Calls list + detail (transcript, recording playback, summary, linked appointment, **"AI got this wrong"** flag button that records `call.flagged_by_owner` events).
- [x] **Messages — threaded by contact**: list groups all messages by conversation with last-message preview, count, "Needs you" flag badge when AI escalated, and "AI paused" badge when the owner has taken over. Drill-down at `/dashboard/messages/[contactId]` shows the full thread as chat bubbles distinguishing customer (muted left), AI replies (copper right), and owner replies (deep-ink right with a "You" label). Includes a flag-reason callout when the AI flagged the thread.
- [x] **Owner reply composer + Pause AI toggle** on every conversation page. Composer uses `Cmd+Enter` to send and persists outbound rows with `sender="owner"` via a server action. Pause toggle flips `contacts.ai_paused`; while paused, inbound messages still land in the dashboard but the AI handler logs `sms.ai_paused_skipped` and stays quiet.
- [x] Bookings list (upcoming appointments)
- [x] Reviews list (pending / sent / clicked / completed)
- [x] **Settings page** — business info, hours grid editor, services/FAQs editors, **voice picker** (curated set of Vapi voices), brand voice notes, emergency criteria, voicemail script, after-hours policy, **per-event notification channel toggles** (SMS/email per booking/emergency/call-summary); save redeploys Vapi assistant
- [x] Billing page: subscription status, Stripe checkout, Stripe customer portal
- [x] Polished empty states across Calls, Bookings, Reviews, Messages with contextual copy + icons.

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

### Production hardening
- [x] **Webhook idempotency** — `webhook_events` table with unique `(provider, event_id)`. Stripe webhook dedupes by event id; all three owner-notification Inngest functions dedupe by appointment/call/vapiCallId so Vapi resends and Inngest retries can't double-fire.
- [x] **Lead webhook signature + rate limit** — `INTERNAL_WEBHOOK_SECRET` required in prod; per-business cap of 12 leads/hour returns `429` with `Retry-After`.
- [x] **Production env guards** — server refuses to start if `DEMO_*` routing vars are set, if `VAPI_WEBHOOK_SECRET` is missing, or if `INTERNAL_WEBHOOK_SECRET` is missing.
- [x] **SMS cost ceiling** — `sendSms` enforces a per-business rolling 30-day cap (default 1000, env-tunable); throws `SmsQuotaExceededError` and logs `sms.quota_exceeded` event.
- [x] **Sentry** — server + client + edge runtimes wired via `instrumentation.ts` + `instrumentation-client.ts`. Tags every event with deploy SHA. No-op without `SENTRY_DSN`. `reportError()` helper in `lib/observability.ts` for tagged manual capture.
- [x] **Onboarding error recovery** — `/onboard/setup/[id]` poller times out at 4 minutes with a "this is taking longer than usual" support fallback instead of spinning forever.
- [x] **Owner feedback loop** — "AI got this wrong" button on every call detail page records `call.flagged_by_owner` events with the owner's note.

### Schema migrations
- [x] `0000_init.sql` — initial 8 tables + RLS
- [x] `0001_add_vapi_phone_and_google_review.sql`
- [x] `0002_add_stripe_fields.sql`
- [x] `0003_add_onboarding_step.sql`
- [x] `0004_add_voice_id.sql` — picker-selected Vapi voice per tenant
- [x] `0005_add_notify_channels.sql` — per-event SMS/email toggles
- [x] `0006_add_webhook_events.sql` — idempotency log for inbound webhooks (Stripe dedupe + notification fan-out dedupe)
- [x] `0007_add_message_sender_and_pause.sql` — `messages.sender` enum (`customer` / `ai` / `owner`) and `contacts.ai_paused` boolean

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
- `TWILIO_MESSAGING_SERVICE_SID` set so new numbers auto-attach to your A2P 10DLC Campaign. (Skip if you're using demo mode below.)
- Stripe webhook endpoint configured to point at `https://<your-tunnel>/api/webhooks/stripe`.
- Cal.com account is connected to a Google Calendar so booking has real availability.
- Three terminals running: `bun dev`, `bun tunnel`, `bunx inngest-cli@latest dev`.

**For repeated testing, enable demo mode** so each signup reuses Tenant Zero's number instead of buying a fresh one:
```
DEMO_TWILIO_NUMBER=+13345649614
DEMO_VAPI_PHONE_NUMBER_ID=9bf6f6eb-5602-4529-85c6-3533b8423f1a
```
See **Dev gotchas → Demo provisioning mode** for the trade-offs.

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
- [ ] **Today** page: AI receptionist number card shown with a working **Copy** button (text flips to "Copied" for 1.5s); 4 metric cards show zeros; three-column panel below (Upcoming / Today's calls / Today's texts) each shows a contextual empty state with a tap-to-call link to the AI number
- [ ] After the first call: metric deltas appear vs yesterday (↑+1 in green for Calls); the call shows up in "Today's calls" with intent/outcome badges; new bookings show up under "Upcoming"
- [ ] After the first inbound text: the conversation shows up under "Today's texts" with the latest message preview; the AI's reply appears as the next bubble in the conversation drill-down
- [ ] **Calls / Bookings / Reviews / Messages**: show contextual empty states with helpful copy (e.g., Messages prompts "Customers who text your AI number show up here"); no errors

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
- [ ] AI calls `send_emergency_alert`; owner phone gets EMERGENCY SMS (with caller phone + address)
- [ ] If `RESEND_API_KEY` is set, owner email also arrives — red banner, "Call back now" tap-to-dial button
- [ ] Call detail in dashboard shows red `emergency` badge
- [ ] `summary` text reflects the emergency

### 5b. Owner notification fan-out (SMS + email)
- [ ] After any test call: owner SMS arrives within a few seconds with a dashboard deep-link
- [ ] If a booking happened: a second SMS + email lands with caller name, service, when, and a "View call" CTA
- [ ] Visit `/dashboard/settings` → **Notifications** card; toggle off email for "Call summary"; save
- [ ] Place another call → only SMS arrives for the call summary; booking/emergency channels respected independently
- [ ] Inngest dev UI shows runs of `notify-owner-appointment-booked`, `notify-owner-emergency`, `notify-owner-call-summary` with per-channel `sent` / `skipped` / `failed` results

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

### 11. Inbound SMS (AI replies)
- [ ] Text the AI number something simple like "Do you guys do water heater installs?" from a different phone
- [ ] `messages` table gets a `direction: inbound, sender: customer` row, then an AI-generated `direction: outbound, sender: ai` row within a few seconds
- [ ] Reply lands on the sending phone — short, on-brand, uses the business's KB
- [ ] Text "my basement is flooding" → AI acknowledges urgency in its reply; an `sms.flagged_for_owner` event lands in the events table; owner phone receives a flag SMS with the customer's message + flag reason
- [ ] Text "STOP" → carrier-level opt-out, no AI reply on top
- [ ] Inngest dev UI shows `respond-to-inbound-sms` run with steps `claim-reply-lock`, `load-context`, `generate-reply`, `send-reply`, (optionally) `notify-owner`
- [ ] Open `/dashboard/messages` — conversation threaded by contact; "Needs you" badge appears on the emergency thread
- [ ] Click into the conversation: customer messages on the left, AI replies on the right in copper, with an "AI" label below each one
- [ ] Flag-reason callout at the top lists what the AI escalated and the customer message that triggered it

### 11b. Owner reply + Pause AI
- [ ] On the conversation page, click **Pause AI** in the header — button flips to "Resume AI"; an "AI paused" badge appears under the contact name
- [ ] Type a reply in the composer at the bottom and send (or hit `Cmd+Enter`)
- [ ] Bubble appears on the right in deep ink with a "You" label below it; the contact's phone receives the SMS
- [ ] `messages` table shows the new row with `sender: owner`
- [ ] Text the AI number again from the customer phone → AI does NOT auto-reply this time; an `sms.ai_paused_skipped` event lands in the events table; inbound message still appears in the conversation
- [ ] Click **Resume AI** → next inbound message gets an AI reply again
- [ ] Today dashboard shows the conversation in the new "Today's texts" panel with a "you" tag on the last sent message

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
