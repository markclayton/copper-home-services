# Response to Google OAuth verification (round 3)

**To:** (reply to the existing verification thread)
**Subject:** Re: Verification request for project copper-ai — OpenRouter integration removed (Option 1)

---

Hi,

Thank you for the detailed review. We've chosen **Option 1: Remove the Integration**.

The OpenRouter integration has been completely removed from our application. All AI/ML calls now go directly to Anthropic via the official Anthropic API. Anthropic's commercial API terms explicitly state that customer inputs and outputs sent through the API are not used to train Anthropic's models — which aligns with the Limited Use requirement of the Google API Services User Data Policy.

## Where the change was made

OpenRouter was used in two places in our backend, both of which have been migrated:

1. **`lib/ai/llm.ts`** — post-call transcript summarization (the path that could potentially include Google-derived data such as a confirmed booking time). Now calls the Anthropic API directly using `claude-sonnet-4-6`.
2. **`lib/ai/sms.ts`** — AI-generated SMS reply drafting. Now calls the Anthropic API directly using `claude-haiku-4-5`.

The `OPENROUTER_API_KEY` environment variable has been removed from our codebase, our `.env.example`, our production environment, and all internal documentation. There is no remaining code path through which any data — Google-derived or otherwise — can reach OpenRouter.

## Updated privacy policy

The privacy policy at **https://joincopper.io/privacy** has been updated:

- The **"Artificial intelligence and machine learning"** section no longer lists OpenRouter. The current AI providers are: **Anthropic** (Claude, for the AI receptionist and post-call summarization), **Deepgram** (speech-to-text), and **Vapi** (voice session orchestration and text-to-speech).
- The **"Who we share it with"** section has been updated to remove OpenRouter from the vendor list.
- The explicit statement remains: *"We do not use Google Workspace data, including any data obtained from Google APIs, to develop, improve, or train any generalized or non-personalized AI or machine learning models."*

All three remaining AI vendors operate under terms that prohibit training on customer data sent through their APIs.

## Demo video

A new demo video walking through the updated end-to-end flow is at: **[INSERT YOUTUBE URL]**

The video shows: connecting Google Calendar via OAuth → AI receptionist taking a sample call → checking calendar availability via `calendar.freebusy` → writing a booking via `calendar.events` → disconnecting and revoking access from the dashboard. It also explicitly demonstrates that no third-party AI providers other than the three named above (Anthropic, Deepgram, Vapi) are involved.

Please let me know if you need anything else to proceed with verification.

Thanks,
Mark Clayton
mark.clayton93@gmail.com
Copper (joincopper.io)
