import { serve } from "inngest/next";
import { inngest } from "@/lib/jobs/client";
import {
  dailyDigest,
  notifyOwnerAppointmentBooked,
  notifyOwnerCallSummary,
  notifyOwnerEmergency,
  outboundLeadCall,
  quoteFollowupReminder,
  respondToInboundSms,
  reviewRequestFlow,
  tenantProvisioning,
} from "@/lib/jobs/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    outboundLeadCall,
    reviewRequestFlow,
    dailyDigest,
    quoteFollowupReminder,
    tenantProvisioning,
    notifyOwnerAppointmentBooked,
    notifyOwnerEmergency,
    notifyOwnerCallSummary,
    respondToInboundSms,
  ],
});
