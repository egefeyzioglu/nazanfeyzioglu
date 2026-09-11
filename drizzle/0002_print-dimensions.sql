ALTER TABLE "nazanfeyzioglu_print" ADD COLUMN "imageWidthInches" double precision;--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_print" ADD COLUMN "imageHeightInches" double precision;--> statement-breakpoint
-- One-time import of known legacy formats. Preserve spec for manual review of
-- unrecognized entries; application code never parses it after this migration.
WITH legacy_sizes AS (
  SELECT id, regexp_match(spec,
    '^[[:space:]]*(?:Giclée print[[:space:]]*·[[:space:]]*)?([0-9]{1,6}(?:[.][0-9]{1,6})?)[[:space:]]*[×x][[:space:]]*([0-9]{1,6}(?:[.][0-9]{1,6})?)[[:space:]]*in[[:space:]]*$', 'i') AS dimensions
  FROM "nazanfeyzioglu_print"
)
UPDATE "nazanfeyzioglu_print" AS p
SET "imageWidthInches" = dimensions[1]::double precision,
    "imageHeightInches" = dimensions[2]::double precision
FROM legacy_sizes
WHERE p.id = legacy_sizes.id
  AND dimensions[1]::double precision > 0
  AND dimensions[2]::double precision > 0;
--> statement-breakpoint
ALTER TABLE "nazanfeyzioglu_print" ADD CONSTRAINT "print_image_dimensions_valid" CHECK (("imageWidthInches" IS NULL AND "imageHeightInches" IS NULL) OR ("imageWidthInches" IS NOT NULL AND "imageHeightInches" IS NOT NULL AND "imageWidthInches" > 0 AND "imageHeightInches" > 0 AND "imageWidthInches" < 'Infinity'::double precision AND "imageHeightInches" < 'Infinity'::double precision));
