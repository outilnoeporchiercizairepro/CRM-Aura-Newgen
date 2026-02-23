/*
  # Add setter_linkedin role - step 1

  Adds `setter_linkedin` to the user_role enum.
*/

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'setter_linkedin';
