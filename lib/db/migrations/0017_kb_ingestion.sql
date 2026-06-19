-- KB ingestion (Tier 2): RAG over uploaded documents + crawled website pages.
--
-- The existing knowledge_base table stays as the deterministic facts layer
-- (hours, services, FAQs, policies) injected into the prompt. These new
-- tables back the search_knowledge tool the assistant calls mid-call when
-- the caller asks something the structured KB doesn't cover.
--
-- Uses pgvector with cosine similarity — the convention for OpenAI's
-- text-embedding-3-small. HNSW gives us sub-50ms top-K on the call hot
-- path even at 100K chunks across all tenants.
--
-- kb_chunks has RLS enabled but no policies — chunks are tool-only and
-- written/read by server-side code with the service role. Fail-closed if
-- accidentally queried from the client.

CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint

-- New onboarding step between business and services where the owner pastes
-- their website URL; we crawl it and pre-fill the services step. Existing
-- tenants in mid-onboarding don't roll backward — the wizard only routes
-- the new step on fresh drafts.
ALTER TYPE "public"."onboarding_step" ADD VALUE IF NOT EXISTS 'website' BEFORE 'services';--> statement-breakpoint

CREATE TYPE "public"."kb_document_source" AS ENUM(
  'upload',
  'crawl',
  'manual'
);--> statement-breakpoint

CREATE TYPE "public"."kb_document_status" AS ENUM(
  'queued',
  'processing',
  'ready',
  'failed'
);--> statement-breakpoint

CREATE TYPE "public"."kb_crawl_status" AS ENUM(
  'queued',
  'discovering',
  'fetching',
  'embedding',
  'ready',
  'failed'
);--> statement-breakpoint

CREATE TABLE "kb_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "crawl_job_id" uuid,
  "source_type" "kb_document_source" NOT NULL,
  "title" text NOT NULL,
  "source_url" text,
  "content_hash" text,
  "status" "kb_document_status" NOT NULL DEFAULT 'queued',
  "error" text,
  "token_count" integer NOT NULL DEFAULT 0,
  "chunk_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "kb_documents_business_status_idx" ON "kb_documents" ("business_id", "status");--> statement-breakpoint
CREATE UNIQUE INDEX "kb_documents_business_hash_unique" ON "kb_documents" ("business_id", "content_hash") WHERE "content_hash" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "kb_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "owners_select_own_kb_documents" ON "kb_documents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));--> statement-breakpoint

CREATE TABLE "kb_chunks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "document_id" uuid NOT NULL REFERENCES "kb_documents"("id") ON DELETE CASCADE,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(1536) NOT NULL,
  "token_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "kb_chunks_business_idx" ON "kb_chunks" ("business_id");--> statement-breakpoint
CREATE INDEX "kb_chunks_embedding_hnsw" ON "kb_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint

ALTER TABLE "kb_chunks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE TABLE "kb_crawl_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "root_url" text NOT NULL,
  "status" "kb_crawl_status" NOT NULL DEFAULT 'queued',
  "pages_total" integer,
  "pages_scraped" integer NOT NULL DEFAULT 0,
  "error" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX "kb_crawl_jobs_business_idx" ON "kb_crawl_jobs" ("business_id", "status");--> statement-breakpoint

ALTER TABLE "kb_crawl_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "owners_select_own_kb_crawl_jobs" ON "kb_crawl_jobs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.businesses b where b.id = business_id and b.owner_user_id = (select auth.uid())));
