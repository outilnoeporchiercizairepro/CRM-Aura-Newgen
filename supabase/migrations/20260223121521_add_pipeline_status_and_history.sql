/*
  # Pipeline commercial - statuts et historique

  ## Résumé
  Ajout du suivi de pipeline commercial entre le R1 (RDV 15min) et le R2 (closing).
  
  ## Changements

  ### 1. Nouveau type enum `pipeline_status_enum`
  Représente les étapes du pipeline commercial :
  - `prospect` : Contact identifié, pas encore de RDV
  - `r1_planifie` : RDV 15min planifié par le client
  - `r1_realise` : RDV 15min effectué
  - `qualifie` : Client qualifié après R1, éligible au R2
  - `non_qualifie` : Client non qualifié après R1
  - `r2_planifie` : RDV de closing planifié
  - `r2_realise` : RDV de closing effectué
  - `close_gagne` : Deal signé
  - `close_perdu` : Deal perdu

  ### 2. Colonne `pipeline_status` sur la table `contacts`
  Statut courant du pipeline pour chaque contact.
  Valeur par défaut : `prospect`.

  ### 3. Nouvelle table `pipeline_history`
  Historique complet de chaque changement de statut pipeline :
  - `id` : Identifiant unique
  - `contact_id` : Référence vers le contact
  - `status` : Statut atteint
  - `changed_at` : Date et heure du changement
  - `notes` : Notes optionnelles (raison de non-qualification, motif de perte, etc.)
  - `r1_date` : Date prévue du R1 (renseignée à l'étape r1_planifie)
  - `r2_date` : Date prévue du R2 (renseignée à l'étape r2_planifie)

  ## Sécurité
  - RLS activé sur `pipeline_history`
  - Policies : authenticated uniquement pour select, insert, update, delete
*/

-- 1. Créer l'enum pipeline_status_enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipeline_status_enum') THEN
    CREATE TYPE pipeline_status_enum AS ENUM (
      'prospect',
      'r1_planifie',
      'r1_realise',
      'qualifie',
      'non_qualifie',
      'r2_planifie',
      'r2_realise',
      'close_gagne',
      'close_perdu'
    );
  END IF;
END $$;

-- 2. Ajouter la colonne pipeline_status sur contacts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'pipeline_status'
  ) THEN
    ALTER TABLE contacts ADD COLUMN pipeline_status pipeline_status_enum DEFAULT 'prospect';
  END IF;
END $$;

-- 3. Créer la table pipeline_history
CREATE TABLE IF NOT EXISTS pipeline_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status pipeline_status_enum NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  notes text DEFAULT '',
  r1_date date DEFAULT NULL,
  r2_date date DEFAULT NULL
);

-- 4. Index pour performance
CREATE INDEX IF NOT EXISTS pipeline_history_contact_id_idx ON pipeline_history(contact_id);
CREATE INDEX IF NOT EXISTS pipeline_history_changed_at_idx ON pipeline_history(changed_at);

-- 5. RLS
ALTER TABLE pipeline_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pipeline history"
  ON pipeline_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert pipeline history"
  ON pipeline_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pipeline history"
  ON pipeline_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete pipeline history"
  ON pipeline_history FOR DELETE
  TO authenticated
  USING (true);
