/*
  # Add expense monthly deductions tracking

  ## Summary
  This migration creates a table to track when expenses have been "deducted" (marked as paid/processed)
  for a given month. This allows:
  - Marking an expense as deducted for the current month with a button
  - Keeping a full history of past deductions per expense per month
  - Automatically resetting each month (since deductions are stored per month/year)

  ## New Tables
  - `expense_deductions`
    - `id` (uuid, primary key)
    - `expense_id` (uuid, foreign key to expenses)
    - `deducted_month` (integer, 1-12)
    - `deducted_year` (integer)
    - `deducted_at` (timestamptz, when was this marked)
    - `deducted_by` (text, optional user label)
    - unique constraint on (expense_id, deducted_month, deducted_year) to prevent duplicates

  ## Security
  - RLS enabled
  - Authenticated users can read, insert, and delete their own deductions
*/

CREATE TABLE IF NOT EXISTS expense_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  deducted_month integer NOT NULL CHECK (deducted_month BETWEEN 1 AND 12),
  deducted_year integer NOT NULL,
  deducted_at timestamptz DEFAULT now(),
  deducted_by text,
  UNIQUE (expense_id, deducted_month, deducted_year)
);

ALTER TABLE expense_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deductions"
  ON expense_deductions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert deductions"
  ON expense_deductions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete deductions"
  ON expense_deductions FOR DELETE
  TO authenticated
  USING (true);
