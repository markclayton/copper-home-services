# Flagship V1 — PRD & Requirements
**Working title:** "Missed Call Killer"
**Audience:** Claude Code (engineering brief)
**Status:** V1 scope locked; tech stack defaults set, override allowed where flagged

---

## 1. Product Overview

An AI front-office service for owner-operated home services businesses (HVAC, plumbing, electrical, etc.). Replaces missed calls, slow lead response, and forgotten review requests with always-on automation. Productized and multi-tenant from day one — every new customer must be deployable in under two hours of operator time.

**Target buyer:** 1–10 truck shops, $500K–$5M revenue, on Housecall Pro / Jobber / ServiceM8 / no CRM. Currently losing 20–40% of inbound calls.

**Anchor pricing (informational, not a build constraint):** $1,500–$3,000 setup + $400–$800/mo MRR.

**V1 success criteria**
- New tenant goes from signed onboarding form to live phone number in **<2 hours of operator time**.
- AI agent books **≥60%** of missed calls in pilot.
- Review requests fire within 2 hours of job completion.
- Owner sees value daily via SMS digest + dashboard.

---

## 2. V1 Scope

### In scope
1. AI voice agent answers missed/forwarded inbound calls, qualifies, books appointments.
2. Instant SMS text-back when a call is missed (fires even if voice agent unavailable).
3. Web form / chat lead → AI outbound speed-to-lead call within 60s.
4. Post-job review request automation (manual trigger + scheduled trigger).
5. Per-tenant knowledge base (services, hours, service area, pricing, FAQ).
6. Owner dashboard (calls, transcripts, bookings, conversion metrics).
7. Owner SMS — per-call summaries + daily digest.
8. Multi-tenant architecture from day 1 (Postgres RLS).
9. Self-service tenant provisioning script driven by a single onboarding form.

### Out of scope (deferred)
- ServiceTitan / deep CRM integration → custom tier.
- Real-time call scoring / coaching dashboard → V2.
- Outbound win-back drip campaigns → V2.
- Google LSA direct integration → V2.
- Multi-user dashboards / RBAC → V2 (single owner login is fine).
- Mobile app, estimate generation, dispatch optimization → out.

---

## 3. Tech Stack (opinionated defaults)

| Layer | Choice | Rationale |
|---|---|---|
| Voice agent | **Vapi** | Best DX for productized voice; native tool calls, transfer, VM detection |
| Telephony | **Twilio** | Vapi sits on it; A2P 10DLC support for SMS at scale |
| SMS | **Twilio** | Same account |
| Backend | **Node.js + TypeScript** (Hono or Fastify) | Webhook-heavy workload, fast iteration |
| DB | **Supabase (Postgres)** | Multi-tenant RLS + auth + storage in one; solo-friendly |
| Frontend | **Next.js 14 (App Router) + Tailwind + shadcn/ui** | Standard stack, Vercel-native |
| Booking | **Cal.com** (managed, API) | Don't build a calendar |
| Background jobs | **Inngest** | Durable, retryable; better than rolling our own queue |
| LLM (summaries, intent classification) | **OpenRouter** (default model: Anthropic Claude Sonnet 4.5) | Routed via OpenAI-compatible API. Outside the voice loop — Vapi handles in-call inference. |
| Payments | **Stripe** | Setup fee + recurring MRR |
| Hosting | **Vercel** (web + API) + **Supabase** (DB) + **Inngest Cloud** | |
| Observability | **Sentry** + Vercel logs | Errors via Sentry; structured app/event history via the `events` table + Vercel runtime logs. Dedicated log store deferred. |

**Override flags:** Vapi vs Retell vs Bland is decision #1 in section 13. Default is Vapi.

---

## 4. Data Model

```
businesses           -- tenants
  id, name, timezone, owner_name, owner_email, owner_phone,
  phone_main, phone_forwarding, service_area_zips[], hours_json,
  cal_com_event_type_id, vapi_assistant_id, twilio_subaccount_sid,
  twilio_number, status, plan_tier, created_at

knowledge_base
  id, business_id, services_jsonb, faqs_jsonb, pricing_jsonb,
  policies_jsonb, brand_voice_notes, updated_at

contacts
  id, business_id, phone, email, name, address, source, tags[],
  first_seen_at, last_seen_at

calls
  id, business_id, contact_id, vapi_call_id, direction,
  status, duration_sec, recording_url, transcript_jsonb,
  summary, intent, outcome, is_emergency, appointment_id,
  started_at, ended_at

messages              -- SMS
  id, business_id, contact_id, direction, body, twilio_sid,
  status, sent_at

appointments
  id, business_id, contact_id, call_id, cal_event_id,
  start_at, end_at, service_type, notes, status

review_requests
  id, business_id, appointment_id, contact_id, channel,
  status (pending/sent/clicked/completed), tracking_token,
  sent_at, completed_at

events                -- audit log + analytics source
  id, business_id, type, payload_jsonb, created_at
```

**Every query filters by `business_id`.** Enforce via Supabase RLS as defense-in-depth even though all access is server-side.

---

## 5. Core User Flows

### Flow 1 — Missed Call → AI Callback + SMS Fallback
1. Customer calls business number.
2. Twilio rings business cell for N seconds (default 15, per-tenant configurable).
3. No answer → forwarded to Vapi assistant.
4. **In parallel**, immediate SMS to caller: *"Hey, this is [Business] — sorry we missed you. Our AI assistant just called you back, or reply here and we'll text you."*
5. Vapi assistant greets, classifies intent (emergency / service / quote / billing / other), qualifies, attempts to book via tool.
6. On book → Cal.com event created, customer confirmation SMS, owner alert SMS.
7. On emergency → immediate SMS to owner + warm transfer attempt.
8. Call summary persisted, per-call SMS to owner with one-line outcome.

### Flow 2 — Web Form / Chat Lead → Speed-to-Lead
1. Lead form on tenant's website POSTs to `/webhooks/lead/{business_id}` (signed).
2. Inngest job triggers Vapi outbound call to lead's phone within 60s.
3. AI opens with: *"Hi, this is [Business] — I saw you just reached out about [service]. Got a minute?"*
4. Same qualification + booking flow as Flow 1.
5. No answer → SMS sent, retry call +1h, then +24h. After three misses, mark as cold.

### Flow 3 — Post-Job Review Request
1. Trigger: scheduled Inngest job at `appointment.end_at + 2h` OR manual "Job Complete" tap in dashboard OR (Phase 2) CRM webhook.
2. SMS to customer: *"Thanks for choosing [Business]! If we did right by you, would you leave a quick Google review? [tracked link]"*
3. Tracked link redirects to Google review URL.
4. If no click in 48h → one nudge SMS, then mark complete regardless.

### Flow 4 — Owner Daily Digest
- 6pm local SMS: *"Today: 12 calls, 8 booked (67%), 2 emergencies handled, 3 reviews requested. [dashboard link]"*

### Flow 5 — Tenant Provisioning (the productization flow — most important)
1. Onboarding form submission → JSON → provisioning script.
2. Script auto-creates: Twilio subaccount + number, Vapi assistant from template (prompt populated from KB), Cal.com event type, Supabase tenant row, Stripe customer.
3. Operator (Mark) reviews call flow live, fixes any voice/wording issues (target: 60–90 min).
4. Status flipped to `live`. Tenant goes into production.

---

## 6. AI Voice Agent Specification

### Per-tenant system prompt template
```
You are [BUSINESS_NAME]'s AI receptionist. Friendly, calm, concise.

BUSINESS CONTEXT:
{business_summary}

SERVICES & APPROXIMATE PRICE RANGES:
{services_with_pricing}

HOURS: {hours_text}
SERVICE AREA: {service_area_text}
EMERGENCY DEFINITION: {emergency_criteria}

YOUR JOB
1. Greet, identify yourself as the AI assistant
2. Determine intent: emergency / service request / quote / existing customer / other
3. EMERGENCY → collect address + brief description → call send_emergency_alert tool
4. SERVICE REQUEST → qualify (issue, address, preferred time) → call book_appointment
5. QUOTE → capture details → promise callback within {quote_callback_window}
6. Always confirm phone number for callback

GUARDRAILS
- Never quote a price not in the pricing config
- Never promise same-day service after {cutoff_time}
- If asked directly, acknowledge you're an AI assistant
- If caller is hostile or threatening → transfer_to_owner

VOICE: {brand_voice_notes}
```

### Tools exposed to the agent
- `book_appointment(service_type, preferred_window, contact)` — creates Cal.com event
- `lookup_existing_customer(phone)` — checks `contacts` table
- `send_emergency_alert(summary, address)` — SMS to owner + attempt warm transfer
- `transfer_to_owner()` — warm transfer to owner cell
- `send_quote_followup(details)` — queue callback task
- `end_call()`

---

## 7. Tenant Onboarding Form

This is the single input that drives everything. Build as a Tally/Typeform-style multi-step web form (or in-app wizard). Output: a single JSON blob consumed by the provisioning script.

**Fields**
- Business name, legal entity, owner name + cell + email
- Main business phone, forwarding phone if different, timezone
- Hours per day-of-week
- Services list, each with rough price range and typical duration
- Service area (ZIPs or radius from address)
- Top 10 FAQs (free text Q&A pairs)
- After-hours policy
- Emergency definition (free text — what counts as emergency for this trade)
- Voicemail script
- Brand voice notes (formal / friendly / blue-collar / regional / etc.)
- Cal.com link or "create one for me"
- Google Business Profile URL
- Existing CRM (dropdown — Housecall Pro / Jobber / ServiceM8 / FieldEdge / None / Other)

---

## 8. Owner Dashboard (V1)

Single-tenant SPA, mobile-first. Sections:

1. **Today** — calls today, booked today, missed, conversion %, est. revenue captured
2. **Calls** — table; filter by booked / missed / emergency; click → transcript + recording + summary + appointment link
3. **Bookings** — upcoming appointments, status
4. **Reviews** — sent / clicked / completed
5. **Settings** — edit knowledge base, hours, services, pricing, owner contacts. **Save in settings re-deploys Vapi assistant prompt automatically.**
6. **Billing** — Stripe customer portal embed

Auth: Supabase magic link, single owner email per tenant.

---

## 9. Repeatability Targets (the productization spec)

A new tenant goes from signed onboarding form → live in **<72 hours wall time, <2 hours operator time**. Achieved via:
- Automated provisioning script (Twilio + Vapi + Cal.com + Stripe + Supabase in one command).
- Templated Vapi assistant; per-tenant prompt is the rendered template.
- Settings UI lets operator tune prompts post-deploy without code changes.
- Pre-built dashboard, zero per-tenant frontend work.

The provisioning script must be **idempotent** — re-running it for an existing tenant updates rather than duplicates.

---

## 10. V1 Acceptance Criteria

- [ ] Net-new tenant provisioned from filled onboarding form to live number in <2 hrs operator time
- [ ] Inbound call to forwarded number answered by Vapi within 2 rings
- [ ] Missed call triggers SMS text-back within 30s
- [ ] Web form submit triggers outbound AI call within 60s
- [ ] AI agent books a test appointment end-to-end (call → Cal.com event → customer confirm SMS → owner alert SMS)
- [ ] Emergency keyword detection triggers SMS + transfer attempt within 5s of detection
- [ ] Job-complete trigger sends review SMS with tracked link
- [ ] Tracked link redirects correctly and increments `clicked` status
- [ ] Owner receives daily 6pm digest SMS in their timezone
- [ ] Owner dashboard shows ONLY their tenant's data (RLS enforced; verified with cross-tenant test)
- [ ] Stripe setup fee + MRR working end-to-end via webhook
- [ ] All errors land in Sentry; structured event history is queryable from the `events` table and Vercel runtime logs

---

## 11. Phased Build Sequence

| Phase | Duration | Deliverable |
|---|---|---|
| **1 — Skeleton + Voice** | Wk 1–2 | Monorepo, Supabase schema + RLS, auth, Vapi+Twilio E2E for one hardcoded test tenant; inbound call → transcript stored |
| **2 — Booking + SMS** | Wk 2–3 | Cal.com integration, `book_appointment` tool, Twilio SMS (text-back, owner alerts, customer confirmations), emergency detection + transfer |
| **3 — Speed-to-Lead + Reviews** | Wk 3–4 | Web form webhook → outbound call, review request flow, tracking links |
| **4 — Dashboard + Onboarding** | Wk 4–5 | Owner dashboard, onboarding form, provisioning script, Stripe billing |
| **5 — Hardening + Tenant Zero** | Wk 5–6 | Sentry/Axiom, run on operator's own number as Tenant Zero, polish provisioning until <2hr |

---

## 12. Environment Variables

```
# Supabase
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY

# Vapi
VAPI_API_KEY
VAPI_ORG_ID
VAPI_ASSISTANT_TEMPLATE_ID

# Twilio
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_DEFAULT_FROM_NUMBER

# OpenRouter (summaries, intent)
OPENROUTER_API_KEY

# Cal.com
CAL_COM_API_KEY

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_SETUP
STRIPE_PRICE_MRR

# Inngest
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY

# Observability
SENTRY_DSN

# App
APP_URL
INTERNAL_WEBHOOK_SECRET   # signing key for inbound webhooks (lead form)
```

---

## 13. Open Decisions (flag back before Phase 1 lock)

1. **Voice provider:** Vapi (default) vs Retell (better raw quality per some reports) vs Bland. Decide before Phase 1 ends.
2. **CRM integration in V1:** PRD says NO. Reconsider if first 3 prospects all demand Housecall Pro sync — but bias toward shipping without it.
3. **BYOD vs new number:** Recommend new tracked Twilio number forwarding from main line on day 1; offer port-in later. Faster to ship, easier to attribute.
4. **Self-serve vs white-glove onboarding:** V1 = white-glove (operator in the loop on every deploy). Self-serve is V2.
5. **Pricing tiers in V1:** One tier only. Segmenting comes after we have data.

---

## 14. Suggested Repo Structure

```
/apps
  /web                  # Next.js dashboard + API routes
  /worker               # Inngest functions, scheduled jobs
/packages
  /db                   # Supabase types, query helpers, RLS policies
  /voice                # Vapi assistant template, tool handlers
  /telephony            # Twilio wrappers (calls, SMS, subaccounts)
  /booking              # Cal.com client
  /shared               # Zod schemas, types, constants
/scripts
  provision-tenant.ts   # The productization script
  seed.ts
```
