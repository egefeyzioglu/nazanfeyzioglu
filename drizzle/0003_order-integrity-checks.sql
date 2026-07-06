ALTER TABLE "nazanfeyzioglu_order" ADD CONSTRAINT "order_quantity_positive" CHECK (quantity > 0);--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD CONSTRAINT "order_unit_amount_nonnegative" CHECK ("unitAmount" >= 0);--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD CONSTRAINT "order_amount_total_nonnegative" CHECK ("amountTotal" >= 0);--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD CONSTRAINT "order_item_type_valid" CHECK ("itemType" in ('print', 'digital'));--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD CONSTRAINT "order_payment_status_valid" CHECK ("paymentStatus" in ('paid', 'refunded'));--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD CONSTRAINT "order_fulfillment_status_valid" CHECK ("fulfillmentStatus" in ('pending', 'fulfilled', 'oversold'));--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_order" ADD CONSTRAINT "order_single_item" CHECK (not ("printId" is not null and "workId" is not null));--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_print" ADD CONSTRAINT "print_price_cents_positive" CHECK ("priceCents" > 0);--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_print" ADD CONSTRAINT "print_edition_size_positive" CHECK ("editionSize" > 0);--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_work" ADD CONSTRAINT "work_digital_price_cents_positive" CHECK ("digitalPriceCents" > 0);