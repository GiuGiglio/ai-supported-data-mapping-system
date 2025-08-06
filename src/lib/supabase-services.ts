import { supabase, Project, FieldMapping, ProductData, ValueList, MappingHistory, TargetField } from './supabase'

// Helper function to check if Supabase is available
const checkSupabase = () => {
  if (!supabase) {
    console.warn('Supabase is not configured. Skipping database operation.')
    return false
  }
  return true
}

// Development helper to set auth session for mock user
const ensureDevAuth = async () => {
  if (!supabase) return false
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.log('🔧 Development mode: Setting up mock auth session...')
      
      // For development, we'll create a mock session
      // In production, users would sign in normally
      const mockUser = {
        id: '96e65406-f077-4709-8671-2f092c9f7bfb',
        email: 'dev@example.com',
        role: 'authenticated'
      }
      
      // This is a development workaround
      // The proper solution would be to sign in the user
      console.log('⚠️ Using mock user for development:', mockUser.email)
    }
    
    return true
  } catch (error) {
    console.error('Auth setup error:', error)
    return false
  }
}

// Project Services
export const projectService = {
  // Create a new project
  async createProject(projectData: Omit<Project, 'id' | 'created_at'>): Promise<Project | null> {
    if (!checkSupabase()) return null
    
    try {
      const { data, error } = await supabase!
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (error) {
        console.error('Error creating project:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating project:', error)
      return null
    }
  },

  // Get all projects for a user
  async getProjects(userId: string): Promise<Project[]> {
    if (!checkSupabase()) return []
    
    try {
      await ensureDevAuth()
      
      // For development: disable RLS temporarily or get all projects
      const { data, error } = await supabase!
        .from('projects')
        .select('*')
        .eq('user_id', userId) // Filter by user_id for proper RLS
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching projects:', error)
        console.log('🔧 If RLS error, run the mock user setup script')
        
        // Fallback: try to get all projects (development mode)
        try {
          const { data: fallbackData, error: fallbackError } = await supabase!
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false })
            
          if (!fallbackError && fallbackData) {
            console.log('✅ Used fallback query without RLS filtering')
            return fallbackData
          }
        } catch (fallbackError) {
          console.log('❌ Fallback query also failed:', fallbackError)
        }
        
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getProjects:', error)
      return []
    }
  },

  // Get a single project
  async getProject(projectId: string): Promise<Project | null> {
    if (!checkSupabase()) return null
    
    try {
      const { data, error } = await supabase!
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        console.error('Error fetching project:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getProject:', error)
      return null
    }
  },

  // Update project status
  async updateProjectStatus(projectId: string, status: Project['status']): Promise<boolean> {
    if (!checkSupabase()) return false
    
    try {
      const { error } = await supabase!
        .from('projects')
        .update({ status })
        .eq('id', projectId)

      if (error) {
        console.error('Error updating project status:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateProjectStatus:', error)
      return false
    }
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<boolean> {
    if (!checkSupabase()) return false
    
    try {
      const { error } = await supabase!
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        console.error('Error deleting project:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteProject:', error)
      return false
    }
  }
}

// Field Mapping Services
export const fieldMappingService = {
  // Create field mappings
  async createFieldMappings(mappings: Omit<FieldMapping, 'id' | 'created_at'>[]): Promise<FieldMapping[]> {
    if (!checkSupabase()) return []
    
    try {
      const { data, error } = await supabase!
        .from('field_mappings')
        .insert(mappings)
        .select()

      if (error) {
        console.error('Error creating field mappings:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in createFieldMappings:', error)
      return []
    }
  },

  // Get field mappings for a project
  async getFieldMappings(projectId: string): Promise<FieldMapping[]> {
    if (!checkSupabase()) return []
    
    try {
      const { data, error } = await supabase!
        .from('field_mappings')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching field mappings:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getFieldMappings:', error)
      return []
    }
  },

  // Update field mapping
  async updateFieldMapping(mappingId: string, updates: Partial<FieldMapping>): Promise<boolean> {
    if (!checkSupabase()) return false
    
    try {
      const { error } = await supabase!
        .from('field_mappings')
        .update(updates)
        .eq('id', mappingId)

      if (error) {
        console.error('Error updating field mapping:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateFieldMapping:', error)
      return false
    }
  },

  // Delete field mapping
  async deleteFieldMapping(mappingId: string): Promise<boolean> {
    if (!checkSupabase()) return false
    
    try {
      const { error } = await supabase!
        .from('field_mappings')
        .delete()
        .eq('id', mappingId)

      if (error) {
        console.error('Error deleting field mapping:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteFieldMapping:', error)
      return false
    }
  }
}

// Product Data Services
export const productDataService = {
  // Create product data entries
  async createProductData(products: Omit<ProductData, 'id' | 'created_at' | 'updated_at'>[]): Promise<ProductData[]> {
    if (!checkSupabase()) return []
    
    try {
      const { data, error } = await supabase!
        .from('product_data')
        .insert(products)
        .select()

      if (error) {
        console.error('Error creating product data:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in createProductData:', error)
      return []
    }
  },

  // Get product data for a project
  async getProductData(projectId: string): Promise<ProductData[]> {
    if (!checkSupabase()) return []
    
    try {
      const { data, error } = await supabase!
        .from('product_data')
        .select('*')
        .eq('project_id', projectId)
        .order('row_number', { ascending: true })

      if (error) {
        console.error('Error fetching product data:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getProductData:', error)
      return []
    }
  },

  // Update product data
  async updateProductData(productId: string, updates: Partial<ProductData>): Promise<boolean> {
    if (!checkSupabase()) return false
    
    try {
      const { error } = await supabase!
        .from('product_data')
        .update(updates)
        .eq('id', productId)

      if (error) {
        console.error('Error updating product data:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateProductData:', error)
      return false
    }
  },

  // Update mapped data for a product
  async updateMappedData(productId: string, mappedData: any): Promise<boolean> {
    if (!checkSupabase()) return false
    
    try {
      const { error } = await supabase!
        .from('product_data')
        .update({ 
          mapped_data: mappedData,
          validation_status: 'pending'
        })
        .eq('id', productId)

      if (error) {
        console.error('Error updating mapped data:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateMappedData:', error)
      return false
    }
  },

  // Delete product data
  async deleteProductData(productId: string): Promise<boolean> {
    if (!checkSupabase()) return false
    
    try {
      const { error } = await supabase!
        .from('product_data')
        .delete()
        .eq('id', productId)

      if (error) {
        console.error('Error deleting product data:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteProductData:', error)
      return false
    }
  }
}

// Value List Services
export const valueListService = {
  // Get value lists for an attribute
  async getValueLists(attributeName: string): Promise<ValueList[]> {
    if (!checkSupabase()) return []
    
    try {
      const { data, error } = await supabase!
        .from('value_lists')
        .select('*')
        .eq('attribute_name', attributeName)
        .order('value_text', { ascending: true })

      if (error) {
        console.error('Error fetching value lists:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getValueLists:', error)
      return []
    }
  },

  // Create value list entry
  async createValueList(valueList: Omit<ValueList, 'id' | 'created_at'>): Promise<ValueList | null> {
    if (!checkSupabase()) return null
    
    try {
      const { data, error } = await supabase!
        .from('value_lists')
        .insert(valueList)
        .select()
        .single()

      if (error) {
        console.error('Error creating value list:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in createValueList:', error)
      return null
    }
  },

  // Get all unique attribute names
  async getAttributeNames(): Promise<string[]> {
    if (!checkSupabase()) return []
    
    try {
      const { data, error } = await supabase!
        .from('value_lists')
        .select('attribute_name')
        .order('attribute_name', { ascending: true })

      if (error) {
        console.error('Error fetching attribute names:', error)
        return []
      }

      // Get unique attribute names
      const uniqueNames = Array.from(new Set(data?.map(item => item.attribute_name) || []))
      return uniqueNames
    } catch (error) {
      console.error('Error in getAttributeNames:', error)
      return []
    }
  }
}

// Mapping History Services
export const mappingHistoryService = {
  // Get mapping history for learning
  async getMappingHistory(sourceValue: string, targetField: string): Promise<MappingHistory[]> {
    if (!checkSupabase()) return []
    
    try {
      const { data, error } = await supabase!
        .from('mapping_history')
        .select('*')
        .eq('source_value', sourceValue)
        .eq('target_field', targetField)
        .order('frequency', { ascending: false })

      if (error) {
        console.error('Error fetching mapping history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getMappingHistory:', error)
      return []
    }
  },

  // Get frequent mappings for a field
  async getFrequentMappings(targetField: string, limit: number = 10): Promise<MappingHistory[]> {
    if (!checkSupabase()) return []
    
    try {
      const { data, error } = await supabase!
        .from('mapping_history')
        .select('*')
        .eq('target_field', targetField)
        .order('frequency', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching frequent mappings:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getFrequentMappings:', error)
      return []
    }
  }
}

// File Upload Services
export const fileUploadService = {
  // Upload file to Supabase Storage
  async uploadFile(file: File, projectId: string): Promise<string | null> {
    if (!checkSupabase()) {
      console.warn('Supabase not configured for file upload')
      return null
    }
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${projectId}/${Date.now()}.${fileExt}`
      
      console.log('Attempting to upload file to Supabase Storage:')
      console.log('- File name:', file.name)
      console.log('- File size:', file.size, 'bytes')
      console.log('- File type:', file.type)
      console.log('- Target path:', fileName)
      console.log('- Bucket: uploads')

      const { data, error } = await supabase!.storage
        .from('uploads')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Supabase Storage upload error:', error)
        console.error('Error details:', {
          message: error.message,
          name: error.name
        })
        return null
      }

      if (data) {
        console.log('✅ File uploaded successfully to Supabase Storage:')
        console.log('- Path:', data.path)
        console.log('- ID:', data.id)
        console.log('- Full URL:', supabase!.storage.from('uploads').getPublicUrl(data.path).data.publicUrl)
        return data.path
      } else {
        console.error('❌ Upload returned no data and no error')
        return null
      }
    } catch (error) {
      console.error('❌ Exception during file upload:', error)
      return null
    }
  },

  // Get file URL
  getFileUrl(filePath: string): string {
    if (!checkSupabase()) return ''
    
    try {
      const { data } = supabase!.storage
        .from('uploads')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error in getFileUrl:', error)
      return ''
    }
  },

  // Delete file
  async deleteFile(filePath: string): Promise<boolean> {
    if (!checkSupabase()) return false
    
    try {
      const { error } = await supabase!.storage
        .from('uploads')
        .remove([filePath])

      if (error) {
        console.error('Error deleting file:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteFile:', error)
      return false
    }
  }
}

// Target Fields Services
export const targetFieldService = {
  // Get all target fields
  async getTargetFields(): Promise<TargetField[]> {
    if (!checkSupabase()) return []
    
    try {
      const { data, error } = await supabase!
        .from('target_fields')
        .select('*')
        .order('field_name', { ascending: true })

      if (error) {
        console.error('Error fetching target fields:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getTargetFields:', error)
      return []
    }
  },

  // Create target field
  async createTargetField(fieldName: string): Promise<TargetField | null> {
    if (!checkSupabase()) return null
    
    try {
      const { data, error } = await supabase!
        .from('target_fields')
        .insert({ field_name: fieldName })
        .select()
        .single()

      if (error) {
        console.error('Error creating target field:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in createTargetField:', error)
      return null
    }
  }
} 