import { Inngest } from "inngest";

export type LeadFormData = {
  businessId: string;
  phone: string;
  name?: string;
  email?: string;
  service?: string;
  message?: string;
  sourceUrl?: string;
};

export type AppointmentBookedData = {
  businessId: string;
  appointmentId: string;
  contactId: string | null;
  endAt: string; // ISO
};

export type ReviewClickedData = {
  reviewRequestId: string;
};

export type QuoteFollowupData = {
  businessId: string;
  details: string;
  customerPhone: string;
  customerName?: string;
  vapiCallId?: string;
};

export type TenantProvisionNeededData = {
  businessId: string;
};

export type EmergencyDetectedData = {
  businessId: string;
  summary: string;
  customerPhone: string;
  address: string;
  vapiCallId?: string;
};

export type CallSummaryReadyData = {
  businessId: string;
  callId: string;
  ownerLine?: string;
};

export const inngest = new Inngest({
  id: "copper-home-services",
});
