-- The white border around prints is 1 inch on all sides, not 2. Update the
-- CMS copy only where it still matches the previous default so custom edits
-- are preserved.
UPDATE "nazanfeyzioglu_site_content"
SET "value" = '1 in on all sides', "updatedAt" = now()
WHERE "key" = 'prints.details.border' AND "value" = '2 in on all sides';--> statement-breakpoint
UPDATE "nazanfeyzioglu_site_content"
SET "value" = 'Image Size is the size of the printed artwork. Overall Paper Size includes the 1-inch white border on all sides.', "updatedAt" = now()
WHERE "key" = 'prints.details.sizeExplanation' AND "value" = 'Image Size is the size of the printed artwork. Overall Paper Size includes the 2-inch white border on all sides.';
