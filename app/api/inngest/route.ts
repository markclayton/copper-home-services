import { serve } from "inngest/next";
import { inngest } from "@/lib/jobs/client";
import {
  dailyDigest,
  outboundLeadCall,
  quoteFollowupReminder,
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
  ],
});
