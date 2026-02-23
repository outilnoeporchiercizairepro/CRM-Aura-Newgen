/*
  # Restrict pipeline_history RLS policies to admin and setter roles

  1. Changes
    - Drop the overly permissive pipeline_history policies (allowed all authenticated users)
    - Add role-based SELECT policy: admin, setter, and setter_linkedin can view
    - Add role-based INSERT policy: admin and setter only can insert
    - Add role-based UPDATE policy: admin and setter only can update
    - Add role-based DELETE policy: admin and setter only can delete

  2. Security
    - setter_linkedin can only READ pipeline history, not modify it
    - Only admin and setter roles can write to pipeline_history
*/

DROP POLICY IF EXISTS "Authenticated users can view pipeline history" ON pipeline_history;
DROP POLICY IF EXISTS "Authenticated users can insert pipeline history" ON pipeline_history;
DROP POLICY IF EXISTS "Authenticated users can update pipeline history" ON pipeline_history;
DROP POLICY IF EXISTS "Authenticated users can delete pipeline history" ON pipeline_history;

CREATE POLICY "Admins and setters can view pipeline history"
  ON pipeline_history
  FOR SELECT
  TO authenticated
  USING (get_user_role() IN ('admin'::user_role, 'setter'::user_role, 'setter_linkedin'::user_role));

CREATE POLICY "Admins and setters can insert pipeline history"
  ON pipeline_history
  FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role() IN ('admin'::user_role, 'setter'::user_role));

CREATE POLICY "Admins and setters can update pipeline history"
  ON pipeline_history
  FOR UPDATE
  TO authenticated
  USING (get_user_role() IN ('admin'::user_role, 'setter'::user_role))
  WITH CHECK (get_user_role() IN ('admin'::user_role, 'setter'::user_role));

CREATE POLICY "Admins and setters can delete pipeline history"
  ON pipeline_history
  FOR DELETE
  TO authenticated
  USING (get_user_role() IN ('admin'::user_role, 'setter'::user_role));
