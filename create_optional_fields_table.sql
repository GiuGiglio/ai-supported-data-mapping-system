-- Create optional_fields table for storing non-required field mappings
-- This table stores fields that don't match the required target_fields
-- but are still valuable data that users might want to keep

CREATE TABLE optional_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,
  source_value TEXT, -- The actual value from the data
  target_field TEXT, -- Optional: if user maps it to a target field later
  field_type TEXT DEFAULT 'text', -- text, number, date, boolean, etc.
  confidence_score FLOAT DEFAULT 0.0,
  is_mapped BOOLEAN DEFAULT false, -- true if user later maps it to a target field
  is_suggested BOOLEAN DEFAULT false, -- true if AI suggests mapping to a target field
  suggested_target TEXT, -- AI suggestion for target field
  reason TEXT, -- Why this field was kept as optional
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_optional_fields_project_id ON optional_fields(project_id);
CREATE INDEX idx_optional_fields_source_field ON optional_fields(source_field);
CREATE INDEX idx_optional_fields_is_mapped ON optional_fields(is_mapped);
CREATE INDEX idx_optional_fields_is_suggested ON optional_fields(is_suggested);

-- Enable Row Level Security
ALTER TABLE optional_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for optional_fields
CREATE POLICY "Users can view optional fields for their projects" ON optional_fields 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = optional_fields.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert optional fields for their projects" ON optional_fields 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = optional_fields.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update optional fields for their projects" ON optional_fields 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = optional_fields.project_id 
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete optional fields for their projects" ON optional_fields 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = optional_fields.project_id 
    AND projects.user_id = auth.uid()
  )
);

-- Function for automatic timestamp updates
CREATE TRIGGER update_optional_fields_updated_at 
BEFORE UPDATE ON optional_fields 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE optional_fields IS 'Stores optional field mappings that do not match required target fields';
COMMENT ON COLUMN optional_fields.source_field IS 'Original field name from uploaded file';
COMMENT ON COLUMN optional_fields.source_value IS 'Actual value from the data for this field';
COMMENT ON COLUMN optional_fields.target_field IS 'Target field if user manually maps it later';
COMMENT ON COLUMN optional_fields.is_mapped IS 'True if user has mapped this to a target field';
COMMENT ON COLUMN optional_fields.is_suggested IS 'True if AI suggests mapping to a target field';
COMMENT ON COLUMN optional_fields.suggested_target IS 'AI suggestion for potential target field mapping';
COMMENT ON COLUMN optional_fields.reason IS 'Explanation why this field was kept as optional';