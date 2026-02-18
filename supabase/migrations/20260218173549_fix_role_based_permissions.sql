/*
  # Fix Role-Based Permissions - Restrict Setter Access

  ## Summary
  This migration implements proper role-based access control to restrict setter users to read-only access on contacts table only, while maintaining full admin access to all tables.

  ## Changes Made

  ### 1. Drop All Existing Permissive Policies
  - Removes all "Enable all access" and "Auth Access" policies from all tables
  - These policies were granting unrestricted access to all authenticated users

  ### 2. Create Role-Based Policies for Each Table

  #### Leads Table
  - **Admins**: Full CRUD access (SELECT, INSERT, UPDATE, DELETE)
  - **Setters**: NO ACCESS

  #### Contacts Table
  - **Admins**: Full CRUD access (SELECT, INSERT, UPDATE, DELETE)
  - **Setters**: READ-ONLY access (SELECT only)

  #### Clients Table
  - **Admins**: Full CRUD access (SELECT, INSERT, UPDATE, DELETE)
  - **Setters**: NO ACCESS

  #### Client Installments Table
  - **Admins**: Full CRUD access (SELECT, INSERT, UPDATE, DELETE)
  - **Setters**: NO ACCESS

  #### Expenses Table
  - **Admins**: Full CRUD access (SELECT, INSERT, UPDATE, DELETE)
  - **Setters**: NO ACCESS

  ### 3. Helper Function
  - Creates a reusable function `get_user_role()` to retrieve the current user's role from the profiles table
  - Returns 'admin' or 'setter' based on authenticated user's email

  ## Security Notes
  - All policies check authentication first
  - Role verification is done through the profiles table
  - Setter users (including setterinsta@aura-academie.com) can ONLY read contacts
  - Admin users maintain full access to all data
*/

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE email = auth.jwt()->>'email'
$$ LANGUAGE SQL SECURITY DEFINER;

-- ====================
-- LEADS TABLE POLICIES
-- ====================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for now" ON leads;
DROP POLICY IF EXISTS "Auth Access" ON leads;

-- Admin: Full access
CREATE POLICY "Admins can do everything on leads"
  ON leads FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ====================
-- CONTACTS TABLE POLICIES
-- ====================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for now" ON contacts;
DROP POLICY IF EXISTS "Auth Access" ON contacts;

-- Admin: Full access
CREATE POLICY "Admins can do everything on contacts"
  ON contacts FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Setter: Read-only access
CREATE POLICY "Setters can view all contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (get_user_role() = 'setter');

-- ====================
-- CLIENTS TABLE POLICIES
-- ====================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for now" ON clients;
DROP POLICY IF EXISTS "Auth Access" ON clients;

-- Admin: Full access
CREATE POLICY "Admins can do everything on clients"
  ON clients FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ====================
-- CLIENT INSTALLMENTS TABLE POLICIES
-- ====================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for now" ON client_installments;
DROP POLICY IF EXISTS "Auth Access" ON client_installments;

-- Admin: Full access
CREATE POLICY "Admins can do everything on client_installments"
  ON client_installments FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- ====================
-- EXPENSES TABLE POLICIES
-- ====================

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Auth Access" ON expenses;

-- Admin: Full access
CREATE POLICY "Admins can do everything on expenses"
  ON expenses FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
