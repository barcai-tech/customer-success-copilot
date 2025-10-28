-- First clear the data since we can't cast the existing text dates reliably
DELETE FROM "contracts";
DELETE FROM "usage_summaries";
DELETE FROM "ticket_summaries";

-- Now convert the column type
ALTER TABLE "contracts" ALTER COLUMN "renewal_date" SET DATA TYPE timestamp USING renewal_date::timestamp without time zone;