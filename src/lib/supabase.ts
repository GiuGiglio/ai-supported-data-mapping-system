import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder-key'

// Create Supabase client with proper error handling
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null

// Database types
export interface Project {
  id: string
  name: string
  user_id: string
  created_at: string
  status: 'processing' | 'completed' | 'error'
  file_name: string
  file_size: number
  total_rows: number
}

export interface FieldMapping {
  id: string
  project_id: string
  source_field: string
  target_field: string
  confidence_score: number
  is_manual: boolean
  created_at: string
}

export interface ProductData {
  id: string
  project_id: string
  row_number: number
  source_data: any
  mapped_data: any
  validation_status: 'pending' | 'valid' | 'invalid'
  quality_score: number
  created_at: string
  updated_at: string
}

export interface ValueList {
  id: string
  attribute_name: string
  value_text: string
  value_id: number
  category: string
  created_at: string
}

export interface MappingHistory {
  id: string
  source_value: string
  target_field: string
  target_value: string
  frequency: number
  last_used: string
}

export interface TargetField {
  id: string
  field_name: string
} 