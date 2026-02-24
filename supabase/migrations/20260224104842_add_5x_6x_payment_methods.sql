/*
  # Add 5x and 6x payment method options

  ## Changes
  - Adds "5x" and "6x" values to the `payment_method_enum` type

  ## Notes
  - PostgreSQL enums can have new values added with ALTER TYPE ... ADD VALUE
  - New values are appended; no data is modified
*/

ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS '5x';
ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS '6x';
