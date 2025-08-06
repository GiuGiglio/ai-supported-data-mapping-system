-- SCHNELLE SUPABASE DEVELOPMENT SETUP
-- Führen Sie dieses SQL in Supabase SQL Editor aus

-- 1. Alle Tabellen für Public Access öffnen (Development)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE value_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_history DISABLE ROW LEVEL SECURITY;

-- 2. Target Fields RLS aktivieren und Public Policy hinzufügen
ALTER TABLE target_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read target_fields" ON target_fields FOR SELECT USING (true);

-- 3. Überprüfung
SELECT 
  tablename, 
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN 'RLS aktiv' ELSE 'RLS deaktiviert' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'field_mappings', 'product_data', 'target_fields', 'value_lists', 'mapping_history')
ORDER BY tablename;

-- 4. Überprüfe ob target_fields Daten hat
SELECT COUNT(*) as target_fields_count FROM target_fields;
SELECT field_name FROM target_fields LIMIT 5;