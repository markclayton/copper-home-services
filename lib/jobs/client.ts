import { Inngest } from "inngest";

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

export type SmsInboundReceivedData = {
  businessId: string;
  messageId: string;
  twilioSid: string;
  fromNumber: string;
  body: string;
};

export type MessageTakenData = {
  businessId: string;
  ownerMessageId: string;
  vapiCallId?: string;
};

export type AppointmentCancelledData = {
  businessId: string;
  appointmentId: string;
  vapiCallId?: string;
  reason: "caller_cancelled" | "owner_cancelled";
};

export type AppointmentRescheduledData = {
  businessId: string;
  appointmentId: string;
  vapiCallId?: string;
  oldStartAt: string;
  newStartAt: string;
};

export const inngest = new Inngest({
  id: "copper-home-services",
});
