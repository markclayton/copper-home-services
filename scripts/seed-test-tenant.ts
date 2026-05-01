/**
 * Seeds a hardcoded "Tenant Zero" — used for Phase 1 end-to-end voice testing.
 *
 * Run:  npm run db:seed
 *
 * Idempotent on the email — re-running updates the existing row in place.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businesses, knowledgeBase } from "@/lib/db/schema";

const TENANT = {
  name: "Tenant Zero HVAC",
  timezone: "America/Los_Angeles",
  ownerName: "Mark Clayton",
  ownerEmail: "mark.clayton93@gmail.com",
  ownerPhone: "+13345468557",
  phoneMain: "+15555550101",
  phoneForwarding: "+15555550100",
  serviceAreaZips: ["94102", "94103", "94110", "94114"],
  hours: {
    mon: { open: "08:00", close: "18:00" },
    tue: { open: "08:00", close: "18:00" },
    wed: { open: "08:00", close: "18:00" },
    thu: { open: "08:00", close: "18:00" },
    fri: { open: "08:00", close: "18:00" },
    sat: { open: "09:00", close: "14:00" },
    sun: { closed: true, open: "", close: "" },
  },
};

const KB = {
  services: [
    {
      name: "AC repair",
      priceRange: "$150 diagnostic + parts",
      typicalDuration: "1–2 hours",
    },
    {
      name: "Furnace repair",
      priceRange: "$150 diagnostic + parts",
      typicalDuration: "1–2 hours",
    },
    {
      name: "AC installation",
      priceRange: "$5,000–$12,000 depending on tonnage",
      typicalDuration: "1 day",
    },
    {
      name: "Annual maintenance / tune-up",
      priceRange: "$129",
      typicalDuration: "1 hour",
    },
  ],
  faqs: [
    { q: "Are you licensed and insured?", a: "Yes, fully licensed and insured in California." },
    { q: "Do you offer free estimates?", a: "Free estimates on installations; diagnostic fee on repairs." },
    { q: "How fast can you come out?", a: "Same-day for emergencies, next business day otherwise." },
  ],
  pricing: { diagnostic: 150, tuneup: 129 },
  policies: { paymentMethods: ["card", "check", "ach"], warranty: "1 year on labor" },
  brandVoiceNotes:
    "Warm, professional, plain-spoken. No jargon unless the caller uses it first.",
  emergencyCriteria:
    "No heat in winter, no AC over 90F, gas smell, water leak, electrical sparking, frozen pipes.",
  voicemailScript:
    "You've reached Tenant Zero HVAC — please leave your name, address, and the issue.",
  afterHoursPolicy:
    "After hours, only emergencies are dispatched. Non-emergency calls are scheduled for next business day.",
  quoteCallbackWindow: "the same business day",
};

async function main() {
  const [existing] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerEmail, TENANT.ownerEmail))
    .limit(1);

  let businessId: string;

  if (existing) {
    await db
      .update(businesses)
      .set({ ...TENANT, updatedAt: new Date() })
      .where(eq(businesses.id, existing.id));
    businessId = existing.id;
    console.log(`Updated existing tenant ${businessId}`);
  } else {
    const [created] = await db
      .insert(businesses)
      .values(TENANT)
      .returning({ id: businesses.id });
    businessId = created.id;
    console.log(`Created tenant ${businessId}`);
  }

  const [existingKb] = await db
    .select({ id: knowledgeBase.id })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.businessId, businessId))
    .limit(1);

  if (existingKb) {
    await db
      .update(knowledgeBase)
      .set({ ...KB, updatedAt: new Date() })
      .where(eq(knowledgeBase.id, existingKb.id));
    console.log("Updated knowledge base");
  } else {
    await db.insert(knowledgeBase).values({ businessId, ...KB });
    console.log("Created knowledge base");
  }

  console.log("\nDone. Tenant Zero ready.");
  console.log(`business_id = ${businessId}`);
  console.log(`Webhook URL = ${process.env.APP_URL ?? "http://localhost:3000"}/api/webhooks/vapi/${businessId}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
