-- Fix field_mappings table schema
-- The table should have 'source_value' not 'source_field'

-- First, check the current schema
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'field_mappings' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- If the table has 'source_field' instead of 'source_value', rename it
-- (Run this only if the above query shows 'source_field' column)

-- ALTER TABLE field_mappings 
-- RENAME COLUMN source_field TO source_value;

-- Alternative: If you want to keep both for compatibility, add the new column
-- ALTER TABLE field_mappings 
-- ADD COLUMN IF NOT EXISTS source_value TEXT;

-- Update existing records (if adding new column)
-- UPDATE field_mappings 
-- SET source_value = source_field 
-- WHERE source_value IS NULL;

-- Make source_value NOT NULL (if adding new column)
-- ALTER TABLE field_mappings 
-- ALTER COLUMN source_value SET NOT NULL;

-- Drop old column (optional, if adding new column)
-- ALTER TABLE field_mappings 
-- DROP COLUMN IF EXISTS source_field;

-- Verify the final schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'field_mappings' 
  AND table_schema = 'public'
ORDER BY ordinal_position;