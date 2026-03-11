/*
  # Étape 1 : Ajouter la valeur 'stagiaire' à l'enum user_role
  
  Cette migration ajoute uniquement la valeur à l'enum.
  L'insertion du profil et les politiques RLS sont dans la migration suivante.
*/

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'stagiaire';
