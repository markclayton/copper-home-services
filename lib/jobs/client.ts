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

export const inngest = new Inngest({
  id: "copper-home-services",
});
