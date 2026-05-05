# Copper — friend test

Thanks for kicking the tires. This is a beta of an AI receptionist for owner-operated home services businesses (HVAC, plumbing, etc.) — it picks up missed calls, qualifies leads, books appointments, and sends owners a daily SMS digest.

You should be able to go from never-heard-of-it to a working AI receptionist in about 5 minutes. Here's what to expect, and the one thing that won't work yet so you don't think I forgot.

## Walking through it

**1. Sign up.** Visit the link I sent you. Click "Get started" and create an account with email + password.

**2. Onboarding wizard.** Five short steps:

- **Business**: name, your name, your cell number, time zone.
- **Services + FAQs**: this one's fun — paste any home-services business URL (real or pretend) and click **Draft**. The AI will read the site and pre-fill services + FAQs for you. Edit whatever it got wrong.
- **Hours**: clock in/out per day. Toggle "closed" for off days.
- **Voice**: write 1-2 sentences describing how you want the AI to sound. ("Friendly, southern, no jargon" is fine. "Curt Brooklyn plumber" works too — try it.)
- **Plan**: pick "Start 7-day free trial" (default) or "Subscribe now". Either takes you to Stripe.

**3. Stripe Checkout.** This is in **test mode**, so use this card:

```
4242 4242 4242 4242
Any future expiration · Any CVC · Any zip
```

You will not be charged. The trial card is only there to feel realistic.

**4. Wait page.** "Setting up your AI…" runs for ~30-60 seconds while the system reserves a phone number, configures Cal.com, and deploys an AI assistant tuned to your business. When it flips to "You're live", it auto-redirects you to your dashboard.

**5. The dashboard.** Today's metrics, sidebar with Calls / Bookings / Reviews / Messages / Settings / Billing. Empty until you make a call.

**6. Call your AI.** This is the fun part. The phone number is shown on the **Today** page (or look in Settings). Call it from your phone. The AI should pick up with whatever brand voice you set, qualify your issue, and try to book you an appointment. Try saying:

- *"My AC isn't working, can someone come look at it?"* — should walk you through booking
- *"There's a gas smell at my house"* — should flag it as an emergency and tell you the owner is being notified

After you hang up, refresh the **Calls** page — you'll see the full transcript, recording playback, AI-generated summary, and the booked appointment if you went that route.

## What won't work yet

**SMS doesn't deliver.** Twilio (the carrier) requires a regulatory approval called A2P 10DLC before they let outbound SMS through to US phones at any volume. I'm in the middle of that registration; it takes a few days. So:

- The "Hey, sorry we missed you, reply here" text-back **won't arrive on your phone**.
- The booking confirmation SMS **won't arrive**.
- The owner alert SMS for emergencies **won't arrive on your owner phone**.
- The daily digest SMS **won't arrive**.
- Review request SMS (sent 2h after a booking ends) **won't arrive**.

You'll see all of these in the **Messages** tab of the dashboard with delivery status `undelivered`. Everything else (the actual call handling, transcript, summary, dashboard, booking) works fully.

## Demo mode caveat

We're sharing **one phone number across all testers** during the beta so you don't each burn a real number for $1/mo. That means the AI on the shared number is configured for whoever signed up most recently. If you signed up an hour ago and the AI sounds wrong, your friend probably just signed up after you. Sign up alone if you want to confirm your specific AI is working, or just check the **Calls** transcript in your own dashboard to confirm the system saw your call.

## Feedback

Anything would be helpful, but I'm especially curious about:

- Did the wizard feel too long, too short, or just right?
- Did the AI-draft from URL surprise you (good or bad)?
- How did the AI sound on the phone? Natural? Stiff? Wrong tone?
- If you tried to book, did anything feel weird about the flow?
- Did anything in the dashboard make you go "huh, what's that"?
- What's missing that you'd expect a tool like this to do?

Send notes / screenshots / voice memos / whatever's easiest. Brutal honesty welcome.

Thanks again for the beta time.
