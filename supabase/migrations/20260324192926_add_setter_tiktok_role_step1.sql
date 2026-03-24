/*
  # Add setter_tiktok role - Step 1: Enum

  ## Summary
  Adds a new role value 'setter_tiktok' to the existing user_role enum type.
  This role is for the TikTok setter user who can only access the TikTok setter page
  and view contacts/clients with source 's-t'.

  ## Changes Made

  ### user_role enum
  - Added new value: 'setter_tiktok'

  ## Notes
  - Uses IF NOT EXISTS to prevent errors on re-deployment
*/

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'setter_tiktok';
