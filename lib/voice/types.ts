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

export type VapiChattyUpdate = {
  type:
    | "conversation-update"
    | "speech-update"
    | "model-output"
    | "hang";
  call?: VapiCallSummary;
};

/**
 * Streamed during the call. Vapi emits partials with the same role until
 * a final lands — we only persist finals on the server side to keep
 * write volume sane.
 */
export type VapiTranscriptStreamMessage = {
  type: "transcript";
  call: VapiCallSummary;
  transcript: string;
  role: "user" | "assistant" | "system";
  transcriptType: "partial" | "final";
  /** Some Vapi versions emit this on transcript events; we use it as the
   *  authoritative time_offset_ms for ordering and dedup. */
  secondsFromStart?: number;
};

export type VapiServerMessage =
  | VapiEndOfCallReport
  | VapiToolCallsMessage
  | VapiStatusUpdate
  | VapiTranscriptStreamMessage
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
