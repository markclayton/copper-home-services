ALTER TABLE "businesses" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "stripe_subscription_id" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "stripe_subscription_status" text;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "setup_fee_paid_at" timestamp with time zone;