ALTER TABLE "nazanfeyzioglu_order" DROP CONSTRAINT IF EXISTS "order_item_type_valid";--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_work" ADD COLUMN IF NOT EXISTS "originalPriceCents" integer;--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_work" ADD COLUMN IF NOT EXISTS "originalUnavailable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD CONSTRAINT "order_item_type_valid" CHECK ("itemType" in ('print', 'digital', 'original'));--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_work" DROP CONSTRAINT IF EXISTS "work_original_price_cents_positive";--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_work" ADD CONSTRAINT "work_original_price_cents_positive" CHECK ("originalPriceCents" > 0);