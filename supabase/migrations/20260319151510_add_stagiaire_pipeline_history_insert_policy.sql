/*
  # Autoriser la stagiaire à insérer dans pipeline_history

  La stagiaire peut modifier le statut pipeline des contacts,
  ce qui nécessite une insertion dans pipeline_history.
  On lui accorde uniquement l'INSERT (pas SELECT, UPDATE, DELETE).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pipeline_history' AND policyname = 'Stagiaires can insert pipeline history'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Stagiaires can insert pipeline history"
        ON pipeline_history FOR INSERT
        TO authenticated
        WITH CHECK (get_user_role() = 'stagiaire')
    $policy$;
  END IF;
END $$;
