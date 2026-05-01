/**
 * Vapi server message envelope types — narrowed to what we handle in V1.
 * Source: https://docs.vapi.ai/server-url/events
 */

export type VapiCallSummary = {
  id: string;
  orgId?: string;
  type?: "inboundPhoneCall" | "outboundPhoneCall" | "webCall";
  startedAt?: string;
  endedAt?: string;
  endedReason?: string;
  customer?: {
    number?: string;
    name?: string;
    email?: string;
  };
  phoneNumber?: {
    number?: string;
    twilioPhoneNumber?: string;
  };
  assistantId?: string;
};

export type VapiTranscriptMessage = {
  role: "user" | "assistant" | "system" | "tool" | "function";
  message?: string;
  time?: number;
  endTime?: number;
  secondsFromStart?: number;
};

export type VapiArtifact = {
  transcript?: string;
  messages?: VapiTranscriptMessage[];
  recordingUrl?: string;
  stereoRecordingUrl?: string;
};

export type VapiAnalysis = {
  summary?: string;
  structuredData?: Record<string, unknown>;
  successEvaluation?: string | boolean;
};

export type VapiToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
};

export type VapiToolCallsMessage = {
  type: "tool-calls";
  call: VapiCallSummary;
  toolCallList: VapiToolCall[];
};

export type VapiEndOfCallReport = {
  type: "end-of-call-report";
  call: VapiCallSummary;
  artifact?: VapiArtifact;
  analysis?: VapiAnalysis;
  durationSeconds?: number;
  endedReason?: string;
};

export type VapiStatusUpdate = {
  type: "status-update";
  call: VapiCallSummary;
  status: string;
};

export type VapiAssistantRequest = {
  type: "assistant-request";
  call: VapiCallSummary;
};

export type VapiChattyUpdate = {
  type:
    | "conversation-update"
    | "transcript"
    | "speech-update"
    | "model-output"
    | "hang";
  call?: VapiCallSummary;
};

export type VapiServerMessage =
  | VapiEndOfCallReport
  | VapiToolCallsMessage
  | VapiStatusUpdate
  | VapiAssistantRequest
  | VapiChattyUpdate;

export type VapiServerPayload = {
  message: VapiServerMessage;
};

export type VapiToolResult = {
  toolCallId: string;
  result: string;
};

export type VapiToolResponse = {
  results: VapiToolResult[];
};
