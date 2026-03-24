/*
  # Add setter_tiktok role - Step 2: RLS Policies

  ## Summary
  Adds Row Level Security policies for the setter_tiktok role, allowing access
  only to contacts and clients linked to source 's-t' (TikTok setter contacts).

  ## Changes Made

  ### contacts table
  - New SELECT policy: setter_tiktok users can view contacts where source = 's-t'

  ### clients table
  - New SELECT policy: setter_tiktok users can view clients linked to contacts with source 's-t'

  ### pipeline_history table
  - New INSERT policy: setter_tiktok users can insert pipeline history entries for s-t contacts

  ## Security Notes
  - setter_tiktok has SELECT only on contacts — no INSERT, UPDATE, or DELETE
  - setter_tiktok has SELECT only on clients — no INSERT, UPDATE, or DELETE
  - setter_tiktok can INSERT pipeline history for their contacts only
*/

CREATE POLICY "Setter TikTok can view s-t contacts"
  ON contacts
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'setter_tiktok'::user_role
    AND source = 's-t'
  );

CREATE POLICY "Setter TikTok can view clients linked to s-t contacts"
  ON clients FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'setter_tiktok'::user_role
    AND EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = clients.contact_id
        AND contacts.source = 's-t'
    )
  );

CREATE POLICY "Setter TikTok can insert pipeline history for s-t contacts"
  ON pipeline_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'setter_tiktok'::user_role
    AND EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = pipeline_history.contact_id
        AND contacts.source = 's-t'
    )
  );
