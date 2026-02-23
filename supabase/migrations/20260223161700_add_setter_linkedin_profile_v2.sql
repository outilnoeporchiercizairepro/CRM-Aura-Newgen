/*
  # Add setter_linkedin profile

  Creates the profile for setterlinkedin@aura-academie.com with role setter_linkedin.
  Primary key is on email column.
*/

INSERT INTO profiles (id, email, role, created_at)
VALUES (
  '3778d069-a6f1-42cc-954a-7f219177eead',
  'setterlinkedin@aura-academie.com',
  'setter_linkedin',
  now()
)
ON CONFLICT (email) DO UPDATE SET role = 'setter_linkedin';
