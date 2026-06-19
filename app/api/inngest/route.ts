import { serve } from "inngest/next";
import { inngest } from "@/lib/jobs/client";
import {
  dailyDigest,
  kbCrawl,
  notifyOwnerAppointmentBooked,
  notifyOwnerCallSummary,
  notifyOwnerEmergency,
  notifyOwnerMessageTaken,
  quoteFollowupReminder,
  respondToInboundSms,
  reviewRequestFlow,
  tenantProvisioning,
  tenantScheduledTeardown,
} from "@/lib/jobs/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    reviewRequestFlow,
    dailyDigest,
    quoteFollowupReminder,
    tenantProvisioning,
    tenantScheduledTeardown,
    notifyOwnerAppointmentBooked,
    notifyOwnerEmergency,
    notifyOwnerCallSummary,
    notifyOwnerMessageTaken,
    respondToInboundSms,
    kbCrawl,
  ],
});
