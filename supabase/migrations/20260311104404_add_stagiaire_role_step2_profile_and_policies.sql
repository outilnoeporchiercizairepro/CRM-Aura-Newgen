/*
  # Étape 2 : Profil Nadine + politiques RLS stagiaire

  ## Résumé
  - Création du profil de Nadine (nadine@aura-academie.com) avec le rôle stagiaire
  - Politique SELECT sur contacts : stagiaire peut lire tous les contacts
  - Politique UPDATE sur contacts : stagiaire peut modifier les contacts
  - Pas de politique INSERT/DELETE : stagiaire ne peut pas créer ni supprimer
  - Pas d'accès à clients : bloque la conversion contact -> client au niveau BDD

  ## Accès stagiaire
  - contacts : SELECT + UPDATE uniquement
  - Tous les autres tables : aucun accès
*/

-- Créer le profil de Nadine
INSERT INTO profiles (email, role)
VALUES ('nadine@aura-academie.com', 'stagiaire')
ON CONFLICT (email) DO UPDATE SET role = 'stagiaire';

-- Politique SELECT pour stagiaire sur contacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contacts' AND policyname = 'Stagiaires can view contacts'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Stagiaires can view contacts"
        ON contacts FOR SELECT
        TO authenticated
        USING (get_user_role() = 'stagiaire')
    $policy$;
  END IF;
END $$;

-- Politique UPDATE pour stagiaire sur contacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contacts' AND policyname = 'Stagiaires can update contacts'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Stagiaires can update contacts"
        ON contacts FOR UPDATE
        TO authenticated
        USING (get_user_role() = 'stagiaire')
        WITH CHECK (get_user_role() = 'stagiaire')
    $policy$;
  END IF;
END $$;
