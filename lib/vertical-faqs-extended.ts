/**
 * Long-tail FAQs per vertical for SEO depth on the /for/{slug} pages.
 * These supplement the curated 5 in lib/landing-verticals.ts. The
 * vertical landing component renders both sets and we emit a single
 * FAQPage JSON-LD covering the full union.
 *
 * Editorial principles:
 *  - Lead with the literal question someone would type into Google,
 *    not a marketer-tidied version.
 *  - 2-3 sentence answers. Anything longer reads as filler and Google
 *    de-prioritizes long answers in rich results.
 *  - Don't promise features we don't ship. Easier to walk back a
 *    deferred answer than a broken promise.
 */

export type ExtendedFaq = { q: string; a: string };

export const EXTENDED_FAQS: Record<string, ExtendedFaq[]> = {
  hvac: [
    {
      q: "Can I keep my existing phone number printed on my truck?",
      a: "Yes. Most HVAC contractors keep their existing number printed on trucks and yard signs, then forward calls to the Copper number. Customers see the number they know; the AI picks up behind the scenes.",
    },
    {
      q: "What does the AI sound like on the phone?",
      a: "You pick one of six natural voices during setup — warm, professional, no robotic clipping. Most callers don't realize they're talking to an AI until you tell them. You can test the voice yourself in the dashboard before going live.",
    },
    {
      q: "How does Copper handle Spanish-speaking callers?",
      a: "English is the primary supported language today. Spanish callers get a polite handoff message so you can call them back. Full bilingual support is on the roadmap.",
    },
    {
      q: "Will the AI book maintenance plan tune-ups against the right slot?",
      a: "Yes. Put your maintenance plan details in the AI's playbook — what's included, how often, member-only pricing — and the AI books the seasonal tune-up against your dispatch calendar without you lifting a finger.",
    },
    {
      q: "What if the AI can't answer a question about a specific system?",
      a: "It says so honestly and offers to take a message or have a tech call back. We tuned the AI to refuse to invent answers about equipment, refrigerant types, or warranty specifics — better to say 'let me have a tech call you' than to guess wrong.",
    },
    {
      q: "Does Copper work for commercial HVAC calls?",
      a: "Solo and Business tiers focus on residential service workflows. For commercial dispatch (multiple buildings, PM contracts, work order routing), email contact-sales@joincopper.io about the Custom tier.",
    },
    {
      q: "How long does it take to actually go live?",
      a: "Most HVAC contractors finish onboarding in under an hour: pick your industry, paste your website, set hours, pick a voice, connect Google Calendar, choose your number. The AI starts answering the same day.",
    },
  ],
  plumbing: [
    {
      q: "Will the AI know which jobs are emergencies and which can wait?",
      a: "You define the criteria — active leaks, burst pipes, sewage backups, no hot water in winter. The AI pages your cell instantly for those and books everything else against your normal dispatch slots.",
    },
    {
      q: "Can it explain my drain camera service to a caller?",
      a: "Yes. Add the service to your dashboard with a short description (what's included, when it's recommended, rough price range) and the AI explains it accurately on the call.",
    },
    {
      q: "What about repeat customers calling for a different issue?",
      a: "The AI recognizes the phone number, greets them as a returning customer, and pulls up their address if you have it on file — no need to re-collect basics they've already given you.",
    },
    {
      q: "Will Google or carriers flag my number as spam after Copper takes over?",
      a: "No. Inbound calls don't trigger spam scoring — that's primarily an outbound issue. For SMS, Copper handles A2P 10DLC compliance and consent capture so your texts deliver cleanly.",
    },
    {
      q: "Can I review every call the AI took?",
      a: "Yes. Every call gets a transcript, a recording, and a one-line summary in the dashboard. You can flag any call for follow-up or pause the AI for a specific phone number while you handle them yourself.",
    },
    {
      q: "What happens if my hours change for the season?",
      a: "Update your hours in the dashboard. The AI picks up the change immediately — no redeploy needed. After-hours policy is configurable too: emergencies still page you while routine calls leave a message.",
    },
    {
      q: "How much does an AI plumbing call actually cost me?",
      a: "Solo includes 500 voice minutes for $79/mo (≈ $0.16/min, all-in). Business is 2,000 minutes for $249/mo (≈ $0.12/min). Compare that to the hourly cost of a human dispatcher or the lost revenue from a missed call.",
    },
  ],
  electrical: [
    {
      q: "Will the AI know when an electrical call is actually dangerous?",
      a: "You define what counts (sparking, burning smell, smoke, no power to the whole house). The AI escalates those to your cell immediately and keeps the caller calm — it'll tell them to leave the breaker off and the home if needed.",
    },
    {
      q: "Can it quote a panel upgrade or EV charger install?",
      a: "It quotes ranges from your pricing. For jobs that require an on-site assessment (panel size, service entrance, wire run), the AI explains that and books a quote visit instead of throwing out a number you can't honor.",
    },
    {
      q: "How does it handle code questions?",
      a: "It answers from your FAQs. Most electricians include 'we pull all required permits and work to code' as a standard line, and the AI repeats it accurately. For specific code questions, it books a callback rather than guessing.",
    },
    {
      q: "Will it recognize a commercial caller differently?",
      a: "If you take commercial work, configure that in the playbook. The AI qualifies and flags commercial leads for a callback so you can scope properly instead of trying to fit a building rewire into a residential dispatch slot.",
    },
    {
      q: "Can the AI book the trip charge or service-call fee transparently?",
      a: "Yes. Add your trip charge to the AI's playbook and it explains it during booking. Most callers prefer the upfront transparency to a surprise on the invoice.",
    },
    {
      q: "What if a caller asks about generator installation?",
      a: "Generator work requires an on-site assessment. The AI explains that, captures the basics (home size, primary need, fuel type if known), and books a quote visit. It won't quote a number it can't honor.",
    },
    {
      q: "How is Copper different from a phone tree or voicemail?",
      a: "Phone trees and voicemail capture intent. Copper converts intent into a booking. It listens, qualifies the job, picks the right slot on your calendar, gets SMS consent, and confirms — all before the caller hangs up.",
    },
  ],
  roofing: [
    {
      q: "What does the AI do during a storm event when call volume spikes?",
      a: "Every caller gets answered immediately — no hold queue, no missed calls. Emergencies (active leaks with rain forecast, exposed decking) page you while routine inspection requests book against your schedule.",
    },
    {
      q: "Can the AI handle insurance claim questions?",
      a: "It answers from your FAQs. Most roofers include their insurance-claim workflow (we meet the adjuster, document damage, file the supplement) and the AI repeats it accurately. For specific claim status, it books a callback.",
    },
    {
      q: "Will it know the difference between a repair and a full replacement?",
      a: "The AI qualifies the job — age of roof, extent of damage, single section vs whole roof — and books a quote visit. It doesn't try to quote a full replacement over the phone; that requires an inspection.",
    },
    {
      q: "How does Copper handle gutter or skylight calls?",
      a: "Add those services to your dashboard and the AI books them like any other. For specialty work (skylight installation, decorative copper), the AI books a quote visit if the job is bigger than a typical repair.",
    },
    {
      q: "Can the AI book ladder-only inspections vs full crews?",
      a: "Yes. Set different appointment types in your dashboard with different durations. The AI picks the right one based on what the caller describes and the slot length the job needs.",
    },
    {
      q: "Does Copper help me get more Google reviews?",
      a: "Two hours after each completed job, Copper texts a friendly review request with a one-tap link to your Google profile. Most roofers see 3-5× more reviews per month with this on.",
    },
    {
      q: "What about leads who say 'we're just shopping for quotes'?",
      a: "The AI books them anyway — that's a real lead, even if competitive. You can review the call and decide whether to follow through. Better to have the quote opportunity than miss it.",
    },
  ],
  "auto-repair": [
    {
      q: "Will the AI know the difference between a diagnostic call and an oil change?",
      a: "Yes. For check-engine lights, weird noises, or anything not-obvious, the AI books a diagnostic. For routine work (oil change, brakes, tires), it books the specific service against the right slot.",
    },
    {
      q: "How does the AI handle 'how much is a brake job?' calls?",
      a: "It quotes a range from your pricing. For exact quotes, it books a free estimate or explains that the price depends on pads vs rotors vs calipers — accurate and honest, which converts better than a guess.",
    },
    {
      q: "Can the AI handle dropping off a car overnight?",
      a: "Yes. If you offer key drop, configure that in the playbook. The AI explains the process and the next-business-day diagnostic timing so the customer knows what to expect.",
    },
    {
      q: "What about tow-in customers?",
      a: "Set the tow-in policy in your FAQs. The AI explains storage fees, what's covered while the car waits for diagnosis, and books the diagnostic for when the car arrives.",
    },
    {
      q: "Will it handle loaner car requests?",
      a: "It answers from your loaner policy (eligibility, jobs over four hours, subject to availability) and asks the customer to confirm at booking. No promises it can't keep.",
    },
    {
      q: "Does Copper integrate with Mitchell, AllData, or my shop management software?",
      a: "Not directly today. The AI books into Google Calendar and texts you the details — most shops forward booked jobs into their SMS or transcribe the highlights into their shop management software.",
    },
    {
      q: "Can the AI text customers when the car is ready?",
      a: "Inbound texts from customers are handled by the AI automatically. Outbound 'your car is ready' updates are typically sent by your team — that's a real-time judgment call we don't try to automate.",
    },
  ],
  salons: [
    {
      q: "Will the AI book by specific stylist, or just any open slot?",
      a: "By stylist. The AI sees each stylist's calendar and books with whoever the guest asks for. New guests without a preference get matched to whoever has the right opening for the service.",
    },
    {
      q: "Can it enforce my cancellation and no-show fees?",
      a: "It explains the policy clearly during booking and confirmation. Charging the fee still happens in your salon software — Copper makes sure no one is surprised when it shows up on their card.",
    },
    {
      q: "How does it handle walk-ins?",
      a: "Configure your walk-in policy. The AI explains availability honestly: 'we welcome walk-ins when stylists are open — booking ahead guarantees the slot.' If your shop is appointment-only, it routes them to book instead.",
    },
    {
      q: "What about color consultations?",
      a: "For specific color advice, the AI books a free consult rather than guessing what's possible. Add your consult policy to the dashboard and the AI references it accurately.",
    },
    {
      q: "Can the AI handle gift card or package questions?",
      a: "Add your gift card policy and package offerings to the FAQ. The AI explains pricing, what's included, and how to purchase — typically routing buyers to your website or front desk.",
    },
    {
      q: "Does it text reminders before the appointment?",
      a: "After-booking SMS confirmation is built in. Day-before reminders are on the roadmap. Most salons rely on the confirmation plus their salon software's built-in reminders until that ships.",
    },
    {
      q: "How does the AI handle services like Brazilian blowouts or balayage that need a real conversation?",
      a: "It books the consultation — those services genuinely require a stylist conversation to scope properly. The AI captures the basics (hair type, current color, desired result) so the consult is productive.",
    },
  ],
  dental: [
    {
      q: "How does the AI know when a dental call is a real emergency?",
      a: "You define what counts (severe pain, swelling, trauma, knocked-out tooth, uncontrolled bleeding). The AI triages those to your next emergency slot and pages the office immediately while keeping the patient calm.",
    },
    {
      q: "Can the AI verify insurance benefits during the call?",
      a: "Not directly — verifying insurance requires logging into a portal. The AI collects the patient's insurance info and books the new-patient visit; your front desk verifies before the appointment.",
    },
    {
      q: "What's Copper's HIPAA stance?",
      a: "Call transcripts and SMS are stored in our infrastructure and we don't sign BAAs at the Solo or Business tiers. For HIPAA-regulated workflows (storing PHI beyond minimum-necessary intake), email contact-sales about the Custom tier.",
    },
    {
      q: "Can it handle different appointment types (cleaning, exam, ortho consult)?",
      a: "Yes. Set the duration and intake questions per appointment type in the dashboard. The AI picks the right slot and collects what you ask for at booking — new patient forms, insurance info, reason for visit.",
    },
    {
      q: "What about pediatric or specialty practice routing?",
      a: "Configure your routing in the playbook. If you only see adults or only kids, the AI explains that respectfully and offers referrals if you've listed them. For multi-doctor practices, it routes by stated preference or specialty.",
    },
    {
      q: "Will the AI follow our no-show fee policy?",
      a: "It explains the policy when booking and confirming so patients are aware. Charging the fee happens in your practice management software — the AI ensures nobody's surprised.",
    },
    {
      q: "Does Copper handle hygiene recall calls?",
      a: "Inbound recall confirmations the AI handles. Outbound recall calls (proactively reaching out to patients due for a cleaning) are not in scope today — that's typically your hygiene coordinator's job.",
    },
  ],
  legal: [
    {
      q: "How does the AI handle confidentiality during intake?",
      a: "The AI is tuned to collect matter type, contact info, and urgency without prompting confidential detail. Call transcripts are stored in our infrastructure and never shared with model providers for training.",
    },
    {
      q: "Will it perform conflict checks?",
      a: "No. The AI collects names and matter type at intake, then your firm runs the conflict check in your management software before the consultation actually proceeds. The AI doesn't have access to your client list.",
    },
    {
      q: "Can it explain hourly vs flat-fee structures?",
      a: "Yes. Add your fee policy to the FAQs — hourly rates by practice area, flat fees for common matters, retainer policy — and the AI explains them clearly. For specific quotes, it books a consultation.",
    },
    {
      q: "What if a caller has an urgent legal matter?",
      a: "Define 'urgent' in the playbook (court date within 48 hours, arrest, active injunction, restraining order). The AI escalates those to the on-call attorney instead of booking out a routine consult two weeks away.",
    },
    {
      q: "Can the AI route by practice area or by attorney?",
      a: "Yes. Configure your routing in the playbook — by practice area, attorney specialty, or new-client vs existing-client. The AI books with the right person based on what the caller describes.",
    },
    {
      q: "Does Copper integrate with Clio, MyCase, or other practice management software?",
      a: "Not directly today. The AI books consultations into Google Calendar and emails the matter details to your firm — most firms transcribe the relevant fields into their practice management software during onboarding the new client.",
    },
    {
      q: "Will it handle solicitor (sales) calls trying to reach the partners?",
      a: "Yes. Configure how you want sales calls handled — most firms have the AI politely decline and decline to take a message for unsolicited vendor calls. The transcript still lands in your inbox if you want to review.",
    },
  ],
};

/**
 * Get the extended FAQ list for a vertical slug. Returns an empty array
 * if the slug has no extension yet — the page still renders the core
 * 5 from landing-verticals.ts.
 */
export function getExtendedFaqs(slug: string): ExtendedFaq[] {
  return EXTENDED_FAQS[slug] ?? [];
}
