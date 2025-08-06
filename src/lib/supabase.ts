import { createClient } from '@supabase/supabase-js'

// Environment variables (with fallback for development)
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Debug environment variables
console.log('🔧 Supabase Configuration Debug:')
console.log('- URL exists:', !!supabaseUrl)
console.log('- URL value:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'undefined')
console.log('- Key exists:', !!supabaseAnonKey)
console.log('- Key value:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined')

// Development fallback (if env vars don't load)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Environment variables not loaded, using development fallback')
  supabaseUrl = 'https://jyvoczkzzqmjlyvgdqlc.supabase.co'
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dm9jemt6enFtamx5dmdkcWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMjUwMzEsImV4cCI6MjA2OTgwMTAzMX0.PEY-_H3_iAbAw7ZjhI6LQIPUGKeMK3uC1rASvoHBm1U'
}

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder-key'

console.log('- Is configured:', isSupabaseConfigured)
console.log('- Final URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'undefined')
console.log('- Final Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined')

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
  source_field: string  // This is what our TypeScript code uses
  target_field: string
  confidence_score: number
  is_manual: boolean
  created_at: string
}

// Database schema interface (what Supabase actually expects)
export interface FieldMappingDB {
  id?: string
  project_id: string
  source_value: string  // This is what the database expects
  target_field: string
  confidence_score: number
  is_manual: boolean
  created_at?: string
}

export interface OptionalField {
  id: string
  project_id: string
  source_field: string
  source_value: string
  target_field?: string
  field_type: string
  confidence_score: number
  is_mapped: boolean
  is_suggested: boolean
  suggested_target?: string
  reason: string
  created_at: string
  updated_at: string
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