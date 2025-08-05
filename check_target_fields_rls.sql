-- ÜBERPRÜFUNG OB TARGET_FIELDS RLS BENÖTIGT
-- Führen Sie dieses SQL in Supabase SQL Editor aus

-- Überprüfe ob target_fields existiert und RLS Status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN 'RLS ist aktiviert - Policy benötigt'
    ELSE 'RLS ist deaktiviert - keine Policy benötigt'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'target_fields';

-- Falls target_fields RLS aktiviert hat, führen Sie das aus:
-- ALTER TABLE target_fields ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public read target_fields" ON target_fields FOR SELECT USING (true);

-- Überprüfe aktuelle Policies für alle relevanten Tabellen
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('projects', 'field_mappings', 'product_data', 'target_fields', 'value_lists', 'mapping_history')
ORDER BY tablename, policyname;