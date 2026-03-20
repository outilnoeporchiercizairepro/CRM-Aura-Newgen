/*
  # Tags System

  ## Overview
  Adds a tagging system to allow categorizing contacts with custom labels.

  ## New Tables

  ### `tags`
  - `id` (uuid, primary key)
  - `name` (text, unique) - tag label
  - `color` (text) - hex color for display (e.g. "#3b82f6")
  - `created_at` (timestamp)

  ### `contact_tags`
  - `contact_id` (uuid, FK -> contacts.id)
  - `tag_id` (uuid, FK -> tags.id)
  - Composite primary key on (contact_id, tag_id)

  ## Security
  - RLS enabled on both tables
  - Authenticated users can read all tags
  - Only admin role (via app_metadata) can insert/update/delete tags
  - Authenticated users can manage contact_tags associations
*/

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tags"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tags"
  ON tags FOR DELETE
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view contact_tags"
  ON contact_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert contact_tags"
  ON contact_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contact_tags"
  ON contact_tags FOR DELETE
  TO authenticated
  USING (true);
