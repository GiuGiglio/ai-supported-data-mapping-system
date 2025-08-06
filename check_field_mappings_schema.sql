-- Check current field_mappings table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'field_mappings'
ORDER BY ordinal_position;
