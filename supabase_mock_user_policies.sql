-- MOCK USER SPECIFIC POLICIES (ALTERNATIVE LÖSUNG)
-- Führen Sie dieses SQL in Supabase SQL Editor aus
-- Diese Policies erlauben nur der spezifischen Mock-User-ID Zugriff

-- Mock User Policies für projects
CREATE POLICY "Mock user access to projects" ON projects
  FOR ALL USING (user_id = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid OR auth.uid() = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid)
  WITH CHECK (user_id = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid OR auth.uid() = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid);

-- Mock User Policies für field_mappings (über projects join)
CREATE POLICY "Mock user access to field_mappings" ON field_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = field_mappings.project_id 
      AND (projects.user_id = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid OR auth.uid() = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = field_mappings.project_id 
      AND (projects.user_id = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid OR auth.uid() = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid)
    )
  );

-- Mock User Policies für product_data (über projects join)
CREATE POLICY "Mock user access to product_data" ON product_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = product_data.project_id 
      AND (projects.user_id = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid OR auth.uid() = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = product_data.project_id 
      AND (projects.user_id = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid OR auth.uid() = '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid)
    )
  );

-- Enable RLS for target_fields if not enabled
ALTER TABLE target_fields ENABLE ROW LEVEL SECURITY;

-- Public Read für target_fields (alle können lesen)
CREATE POLICY "Public read target_fields" ON target_fields
  FOR SELECT USING (true);

-- Überprüfung
SELECT 'Mock User ID Check' as info, '96e65406-f077-4709-8671-2f092c9f7bfb'::uuid as mock_user_id;