/*
  # Add setter_tiktok user profile

  ## Summary
  Inserts the profile for the TikTok setter user with role 'setter_tiktok'.
  Uses ON CONFLICT to handle re-deployment safely.

  ## Changes Made

  ### profiles table
  - Inserts profile for settertiktok@aura-academie.com with role setter_tiktok

  ## Notes
  - The auth user is created separately via admin SQL
  - ON CONFLICT (email) ensures this is idempotent
*/

INSERT INTO profiles (id, email, role, created_at)
VALUES (
  '84db4c9c-d714-422a-986b-682bc8f21b4a',
  'settertiktok@aura-academie.com',
  'setter_tiktok',
  now()
)
ON CONFLICT (email) DO UPDATE SET role = 'setter_tiktok';
