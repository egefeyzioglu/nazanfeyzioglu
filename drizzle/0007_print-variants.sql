ALTER TABLE "nazanfeyzioglu_order" ALTER COLUMN "itemTitle" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_print" ADD COLUMN "parentPrintId" integer;--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_print" ADD CONSTRAINT "nazanfeyzioglu_print_parentPrintId_nazanfeyzioglu_print_id_fk" FOREIGN KEY ("parentPrintId") REFERENCES "public"."nazanfeyzioglu_print"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "print_parent_idx" ON "nazanfeyzioglu_print" USING btree ("parentPrintId");--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_print" ADD CONSTRAINT "print_not_own_parent" CHECK ("parentPrintId" <> id);