ALTER TABLE "nazanfeyzioglu_order" ADD COLUMN IF NOT EXISTS "trackingCarrier" varchar(32);--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD COLUMN IF NOT EXISTS "trackingNumber" varchar(128);--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD COLUMN IF NOT EXISTS "shippingEmailAttemptId" varchar(36);--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD COLUMN IF NOT EXISTS "shippedEmailSentAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD CONSTRAINT "order_tracking_carrier_valid" CHECK ("trackingCarrier" is null or "trackingCarrier" in ('canada_post', 'ups', 'fedex', 'purolator', 'dhl', 'usps', 'other'));
