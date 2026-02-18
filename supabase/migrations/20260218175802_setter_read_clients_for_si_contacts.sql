/*
  # Setter Read Access for Clients (source s-i contacts only)

  ## Summary
  Allows setter users to read client data, but only for clients whose associated contact
  has a source of 's-i'. This enables the setter to see the deal amount, payment method,
  and their commission on their own contacts.

  ## Changes Made

  ### clients table
  - New SELECT policy for setters: can only read clients linked to contacts with source 's-i'

  ## Security Notes
  - Setters cannot access clients from any other source
  - Setters have SELECT only — no INSERT, UPDATE, or DELETE
*/

CREATE POLICY "Setters can view clients linked to s-i contacts"
  ON clients FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'setter'
    AND EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.id = clients.contact_id
        AND contacts.source = 's-i'
    )
  );
