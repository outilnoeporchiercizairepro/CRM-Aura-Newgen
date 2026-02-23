/*
  # Add r1_date and r2_date columns to contacts

  ## Summary
  Adds two date columns directly on the contacts table for quick access to R1 and R2 meeting dates,
  avoiding complex joins with pipeline_history for list views.

  ## Changes
  - `contacts.r1_date` (date, nullable): Date of the first meeting (R1)
  - `contacts.r2_date` (date, nullable): Date of the second meeting (R2)

  These replace the usage of `first_closing_date` as the R1 reference in the list view.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'r1_date'
  ) THEN
    ALTER TABLE contacts ADD COLUMN r1_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'r2_date'
  ) THEN
    ALTER TABLE contacts ADD COLUMN r2_date date;
  END IF;
END $$;
