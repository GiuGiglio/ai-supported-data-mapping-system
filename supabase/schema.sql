-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
-- ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Projekte/Uploads
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'processing',
  file_name TEXT,
  file_size INTEGER,
  total_rows INTEGER
);

-- Mapping-Konfiguration
CREATE TABLE field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL,
  confidence_score FLOAT,
  is_manual BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produktdaten
CREATE TABLE product_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  row_number INTEGER,
  source_data JSONB, -- Original input data
  mapped_data JSONB, -- Mapped to target schema
  validation_status TEXT DEFAULT 'pending',
  quality_score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Value-Listen
CREATE TABLE value_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_name TEXT NOT NULL,
  value_text TEXT NOT NULL,
  value_id INTEGER,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mapping-Historie für Learning
CREATE TABLE mapping_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_value TEXT,
  target_field TEXT,
  target_value TEXT,
  frequency INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_field_mappings_project_id ON field_mappings(project_id);
CREATE INDEX idx_product_data_project_id ON product_data(project_id);
CREATE INDEX idx_value_lists_attribute_name ON value_lists(attribute_name);
CREATE INDEX idx_mapping_history_source_value ON mapping_history(source_value);

-- Row Level Security (RLS) Policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE value_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_history ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Field mappings policies
CREATE POLICY "Users can view field mappings for their projects" ON field_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = field_mappings.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert field mappings for their projects" ON field_mappings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = field_mappings.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update field mappings for their projects" ON field_mappings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = field_mappings.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete field mappings for their projects" ON field_mappings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = field_mappings.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Product data policies
CREATE POLICY "Users can view product data for their projects" ON product_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = product_data.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert product data for their projects" ON product_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = product_data.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update product data for their projects" ON product_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = product_data.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete product data for their projects" ON product_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = product_data.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Value lists are public (read-only for all users)
CREATE POLICY "Anyone can view value lists" ON value_lists
  FOR SELECT USING (true);

CREATE POLICY "Only authenticated users can insert value lists" ON value_lists
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can update value lists" ON value_lists
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only authenticated users can delete value lists" ON value_lists
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Mapping history policies
CREATE POLICY "Users can view mapping history" ON mapping_history
  FOR SELECT USING (true);

CREATE POLICY "Users can insert mapping history" ON mapping_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update mapping history" ON mapping_history
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_data_updated_at 
    BEFORE UPDATE ON product_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to increment mapping history frequency
CREATE OR REPLACE FUNCTION increment_mapping_frequency()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO mapping_history (source_value, target_field, target_value, frequency, last_used)
    VALUES (NEW.source_value, NEW.target_field, NEW.target_value, 1, NOW())
    ON CONFLICT (source_value, target_field, target_value)
    DO UPDATE SET 
        frequency = mapping_history.frequency + 1,
        last_used = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add unique constraint to mapping_history for conflict resolution
ALTER TABLE mapping_history ADD CONSTRAINT unique_mapping 
    UNIQUE (source_value, target_field, target_value);

-- Trigger for automatic mapping history updates
CREATE TRIGGER update_mapping_history
    AFTER INSERT ON field_mappings
    FOR EACH ROW
    EXECUTE FUNCTION increment_mapping_frequency(); 