/*
  # Add RLS policy for setter_linkedin role on contacts

  1. Changes
    - Add SELECT policy on `contacts` table for users with role `setter_linkedin`
    - Mirrors the existing `setter` SELECT policy
*/

CREATE POLICY "Setter LinkedIn can view all contacts"
  ON contacts
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'setter_linkedin'::user_role);
