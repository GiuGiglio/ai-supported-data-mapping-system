'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { projectService, productDataService, fileUploadService } from '@/lib/supabase-services'
import { supabase } from '@/lib/supabase'

interface FileUploadProps {
  onFileProcessed: (data: any[], fileName: string, projectId: string, fieldDescriptions?: Record<string, string>) => void
}

interface UploadedFile {
  file: File
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  data?: any[]
  projectId?: string
  error?: string
}

const ACCEPTED_FILE_TYPES = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt']
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// Helper function to detect Excel template format (enhanced for complex templates)
const detectExcelTemplate = (data: any[]): boolean => {
  if (!data || data.length < 3) return false
  
  console.log('🔍 Analyzing Excel structure...')
  console.log('📊 Total rows:', data.length)
  
  // Log first few rows to understand structure
  data.slice(0, Math.min(8, data.length)).forEach((row, index) => {
    const values = Object.values(row).filter(v => v !== null && v !== undefined && String(v).trim() !== '')
    console.log(`Row ${index + 1}:`, values.length > 0 ? values.slice(0, 5) : ['(empty)'])
  })
  
  // Check different patterns:
  
  // Pattern 1: Row 2 has field names, Row 3 has data
  const row2Values = Object.values(data[1] || {}).filter(v => 
    v !== null && v !== undefined && String(v).trim() !== ''
  )
  const row3Values = Object.values(data[2] || {}).filter(v => 
    v !== null && v !== undefined && String(v).trim() !== ''
  )
  
  const hasFieldNamesInRow2 = row2Values.some(value => 
    typeof value === 'string' && 
    (value.includes('Article Number') || value.includes('GTIN') || value.includes('Portal Name') || 
     value.includes('Product') || value.includes('Weight') || value.includes('Description'))
  )
  
  // Pattern 3: Check if data is transposed (vertical layout with "Important Initial Data")
  const isTransposedData = data.some(row => 
    Object.keys(row).some(key => key.includes('Important Initial Data'))
  )
  
  console.log('🔍 Additional detection patterns:', {
    isTransposedData
  })
  
  // Pattern 2: Look for description rows (Row 6-7)
  const hasDescriptionRows = data.length >= 6 && 
    Object.values(data[4] || {}).some(value => 
      typeof value === 'string' && value.toLowerCase().includes('beschreibung')
    )
  
  console.log('🔍 Template detection patterns:', {
    hasFieldNamesInRow2,
    hasDescriptionRows,
    row2ValuesCount: row2Values.length,
    row3ValuesCount: row3Values.length,
    rowCount: data.length
  })
  
  return (hasFieldNamesInRow2 || hasDescriptionRows || isTransposedData) && data.length >= 3
}

// Helper function to parse transposed Excel template (vertical layout)
const parseTransposedExcelTemplate = (data: any[]): { processedData: any[], fieldDescriptions: Record<string, string> } => {
  console.log('📋 Parsing transposed Excel template...')
  
  // In transposed format, each row represents a field-value pair
  // Row structure: { "Important Initial Data": "Article Number/SKU" }
  //                { "Important Initial Data": "WETA860104342" }
  //                { "Important Initial Data": "Beschreibung" }
  //                { "Important Initial Data": "Herstellerkürzel + SKU ohne Bindestriche" }
  
  const fieldValuePairs: string[] = []
  
  // Extract all values from the "Important Initial Data" column
  data.forEach((row, index) => {
    const value = row['Important Initial Data']
    if (value && typeof value === 'string' && value.trim() !== '') {
      fieldValuePairs.push(value.trim())
      console.log(`Row ${index + 1}: "${value}"`)
    }
  })
  
  console.log('📊 Extracted field-value pairs:', fieldValuePairs)
  
  // Parse the pattern: field name followed by field value
  const processedData = []
  const fieldDescriptions: Record<string, string> = {}
  
  let currentFieldName = ''
  let currentFieldValue = ''
  let isInDescriptionSection = false
  
  for (let i = 0; i < fieldValuePairs.length; i++) {
    const value = fieldValuePairs[i]
    
    // Check if this is a field name (contains typical field indicators)
    const isFieldName = value.includes('Number') || value.includes('GTIN') || value.includes('Product') || 
                       value.includes('Weight') || value.includes('Description') || value.includes('Portal') ||
                       value.includes('Price') || value.includes('Category') || value.includes('Brand')
    
    // Check if we're entering description section
    if (value.toLowerCase().includes('beschreibung')) {
      isInDescriptionSection = true
      continue
    }
    
    if (isFieldName && !isInDescriptionSection) {
      // This is a field name, next value should be the data
      currentFieldName = value
      if (i + 1 < fieldValuePairs.length) {
        currentFieldValue = fieldValuePairs[i + 1]
        console.log(`📋 Field mapping: "${currentFieldName}" = "${currentFieldValue}"`)
        // Skip the next value since we've used it
        i++
      }
    } else if (isInDescriptionSection && currentFieldName) {
      // This is a description for the current field
      fieldDescriptions[currentFieldName] = value
      console.log(`📚 Field description: "${currentFieldName}" = "${value}"`)
    }
  }
  
  // Create a single data row with all field mappings
  const dataRow: any = {}
  
  // Parse all field-value pairs systematically
  for (let i = 0; i < fieldValuePairs.length; i++) {
    const value = fieldValuePairs[i]
    
    // Skip description section marker
    if (value.toLowerCase().includes('beschreibung')) {
      break // Stop processing when we hit description section
    }
    
    // Check if this is a field name
    const isFieldName = value.includes('Number') || value.includes('GTIN') || value.includes('Product') || 
                       value.includes('Weight') || value.includes('Description') || value.includes('Portal') ||
                       value.includes('Price') || value.includes('Category') || value.includes('Brand') ||
                       value.includes('Name') || value.includes('SKU') || value.includes('EAN') ||
                       value.includes('Barcode') || value.includes('Manufacturer') || value.includes('Producer')
    
    if (isFieldName && i + 1 < fieldValuePairs.length) {
      const nextValue = fieldValuePairs[i + 1]
      
      // Check if next value is NOT another field name (i.e., it's the data value)
      const nextIsFieldName = nextValue.includes('Number') || nextValue.includes('GTIN') || nextValue.includes('Product') || 
                             nextValue.includes('Weight') || nextValue.includes('Description') || nextValue.includes('Portal') ||
                             nextValue.includes('Price') || nextValue.includes('Category') || nextValue.includes('Brand') ||
                             nextValue.includes('Name') || nextValue.includes('SKU') || nextValue.includes('EAN') ||
                             nextValue.includes('Barcode') || nextValue.includes('Manufacturer') || nextValue.includes('Producer')
      
      if (!nextIsFieldName && !nextValue.toLowerCase().includes('beschreibung')) {
        // This is a field-value pair
        dataRow[value] = nextValue
        console.log(`📋 Field mapping: "${value}" = "${nextValue}"`)
        i++ // Skip the value we just processed
      }
    }
  }
  
  if (Object.keys(dataRow).length > 0) {
    processedData.push(dataRow)
  }
  
  console.log('🎉 Transposed template parsing completed:')
  console.log('  - Data rows:', processedData.length)
  console.log('  - Field descriptions:', Object.keys(fieldDescriptions).length)
  if (processedData.length > 0) {
    console.log('📋 Sample processed row:', processedData[0])
  }
  
  return { processedData, fieldDescriptions }
}

// Helper function to parse Excel template format (enhanced for complex structure)
const parseExcelTemplate = (data: any[]): { processedData: any[], fieldDescriptions: Record<string, string> } => {
  console.log('📋 Parsing enhanced Excel template format...')
  
  if (data.length < 3) {
    console.warn('⚠️ Template needs at least 3 rows')
    return { processedData: data, fieldDescriptions: {} }
  }
  
  // Check if this is transposed data (vertical layout)
  const isTransposed = data.some(row => 
    Object.keys(row).some(key => key.includes('Important Initial Data'))
  )
  
  if (isTransposed) {
    console.log('🔄 Detected transposed data - converting to horizontal format...')
    return parseTransposedExcelTemplate(data)
  }
  
  // Enhanced structure:
  // Row 1: Empty
  // Row 2: Field names (target fields + additional fields)
  // Row 3: Source data values
  // Row 4: Empty
  // Row 5: "Beschreibung" marker
  // Row 6-7: Field descriptions (important for AI training!)
  
  const fieldNamesRow = data[1] // Row 2 (index 1)
  const sourceDataRow = data[2] // Row 3 (index 2)
  
  console.log('🏷️ Field names row (Row 2):', Object.values(fieldNamesRow).slice(0, 8))
  console.log('📊 Source data row (Row 3):', Object.values(sourceDataRow).slice(0, 8))
  
  // Extract field names from row 2 - these are our target field names
  const fieldNames = Object.values(fieldNamesRow).filter(value => 
    value && typeof value === 'string' && value.trim() !== ''
  ) as string[]
  
  // Extract source data values from row 3
  const sourceDataValues = Object.values(sourceDataRow)
  
  console.log('🎯 Extracted field names:', fieldNames)
  console.log('📈 Source data values count:', sourceDataValues.length)
  
  // Extract field descriptions from rows 6-7 (if available)
  const fieldDescriptions: Record<string, string> = {}
  
  if (data.length >= 6) {
    console.log('📝 Looking for field descriptions...')
    
    // Check if row 5 has "Beschreibung" marker
    const row5Values = Object.values(data[4] || {})
    const hasDescriptionMarker = row5Values.some(value => 
      typeof value === 'string' && value.toLowerCase().includes('beschreibung')
    )
    
    if (hasDescriptionMarker) {
      console.log('✅ Found description marker in row 5')
      
      // Extract descriptions from rows 6-7
      const descriptionRows = [data[5], data[6]].filter(Boolean)
      
      descriptionRows.forEach((row, rowIndex) => {
        const descriptions = Object.values(row)
        
        descriptions.forEach((desc, colIndex) => {
          if (desc && typeof desc === 'string' && desc.trim() !== '' && colIndex < fieldNames.length) {
            const fieldName = fieldNames[colIndex]
            if (fieldName) {
              if (!fieldDescriptions[fieldName]) {
                fieldDescriptions[fieldName] = desc.trim()
              } else {
                fieldDescriptions[fieldName] += ' ' + desc.trim()
              }
            }
          }
        })
      })
      
      console.log('📚 Extracted field descriptions:', fieldDescriptions)
    }
  }
  
  // Create processed data - single row with field names as keys and source values as values
  const processedData = []
  
  if (sourceDataValues.length > 0) {
    const dataRow: any = {}
    
    fieldNames.forEach((fieldName, index) => {
      if (index < sourceDataValues.length) {
        const value = sourceDataValues[index]
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          dataRow[fieldName] = value
        }
      }
    })
    
    // Only add row if it has data
    if (Object.keys(dataRow).length > 0) {
      processedData.push(dataRow)
    }
  }
  
  console.log('🎉 Enhanced template parsing completed:')
  console.log('  - Data rows:', processedData.length)
  console.log('  - Field descriptions:', Object.keys(fieldDescriptions).length)
  if (processedData.length > 0) {
    console.log('📋 Sample processed row:', processedData[0])
  }
  
  return { processedData, fieldDescriptions }
}

// Helper function to clean Excel data from empty columns and rows
const cleanExcelData = (data: any[]): { cleanedData: any[], fieldDescriptions?: Record<string, string> } => {
  if (!data || data.length === 0) return { cleanedData: data }

  console.log('🧹 Cleaning Excel data:', data.length, 'rows')
  console.log('🔍 Sample raw row:', data[0])
  
  // Check if field descriptions were stored during XLSX parsing fix
  const storedFieldDescriptions = (data as any)._fieldDescriptions
  if (storedFieldDescriptions) {
    console.log('📚 Found stored field descriptions from XLSX parsing:', storedFieldDescriptions)
    // Clean the data and return with stored descriptions
    delete (data as any)._fieldDescriptions // Remove the temporary property
    return { cleanedData: data, fieldDescriptions: storedFieldDescriptions }
  }
  
  // Check if this is a template format
  if (detectExcelTemplate(data)) {
    const { processedData, fieldDescriptions } = parseExcelTemplate(data)
    return { cleanedData: processedData, fieldDescriptions }
  }

  const cleanedData = data.map(row => {
    const cleanedRow: any = {}
    
    Object.keys(row).forEach(key => {
      // Skip empty or invalid keys
      if (!key || 
          key.trim() === '' || 
          key.startsWith('__EMPTY') || 
          key.includes('__EMPTY__') ||
          key.startsWith('_EMPTY')) {
        return
      }
      
      // Clean the key name and check if value has content
      const cleanKey = key.trim()
      const value = row[key]
      
      // Only include if key has meaningful content (be less restrictive with values for mapping)
      if (cleanKey) {
        // Include the field even if value is empty - let AI mapping handle it
        cleanedRow[cleanKey] = value || ''
      }
    })
    
    return cleanedRow
  }).filter(row => {
    // Keep rows that have at least one meaningful field name (don't filter by content)
    const fieldNames = Object.keys(row)
    const hasValidFields = fieldNames.length > 0
    
    // Removed debug log
    
    return hasValidFields
  })

  console.log('✨ Cleaned data:', cleanedData.length, 'rows')
  if (cleanedData.length > 0) {
    console.log('📋 Sample cleaned row:', cleanedData[0])
    console.log('🏷️ Cleaned keys:', Object.keys(cleanedData[0]))
  }

  return { cleanedData }
}

export function FileUpload({ onFileProcessed }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const processFile = async (file: File): Promise<{data: any[], fieldDescriptions?: Record<string, string>}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          let jsonData: any[] = []
          let extractedFieldDescriptions: Record<string, string> | undefined = undefined

          if (file.type === 'application/json') {
            jsonData = JSON.parse(data as string)
          } else if (file.type === 'text/csv') {
            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              defval: '',
              blankrows: false
            })
            const { cleanedData, fieldDescriptions } = cleanExcelData(jsonData)
            jsonData = cleanedData
            extractedFieldDescriptions = fieldDescriptions
            
            // Store field descriptions for AI training (if available)
            if (fieldDescriptions && Object.keys(fieldDescriptions).length > 0) {
              console.log('📚 Field descriptions extracted for AI training:', fieldDescriptions)
            }
          } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
            console.log('📊 Processing Excel file:', file.name, 'Type:', file.type)
            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            console.log('📋 Sheet name:', sheetName)
            
            // Convert with better options to avoid empty column issues
            // First try: Standard conversion
            jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              defval: '',
              blankrows: false,
              raw: false
            })
            
            // Check if we got the "Important Initial Data" problem (XLSX parsing issue)
            const hasImportantInitialData = jsonData.some(row => 
              Object.keys(row).some(key => key.includes('Important Initial Data'))
            )
            
            if (hasImportantInitialData) {
              console.log('🔧 Detected XLSX parsing issue - trying alternative parsing...')
              
              // Alternative parsing: Use sheet_to_json without headers, then manually structure
              const rawData = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1, // Use array format instead of object format
                defval: '',
                blankrows: false,
                raw: false
              })
              
              console.log('📊 Raw sheet data (first 8 rows):', rawData.slice(0, 8))
              
              // Manual parsing based on your structure:
              // Row 1: empty, Row 2: field names, Row 3: values, Row 4: empty, Row 5-7: descriptions
              if (rawData.length >= 3) {
                const fieldNamesRow = rawData[1] // Row 2 (index 1) - field names
                const valuesRow = rawData[2]     // Row 3 (index 2) - values
                
                console.log('🏷️ Field names row:', fieldNamesRow)
                console.log('📊 Values row:', valuesRow)
                
                // Create proper object structure with duplicate handling
                const properData: any = {}
                const duplicateTracker: Record<string, any[]> = {}
                
                if (fieldNamesRow && valuesRow) {
                  fieldNamesRow.forEach((fieldName: string, index: number) => {
                    if (fieldName && fieldName.trim() !== '' && index < valuesRow.length) {
                      const value = valuesRow[index]
                      if (value !== null && value !== undefined) {
                        const cleanFieldName = fieldName.trim()
                        
                        // Check if this field name already exists
                        if (properData.hasOwnProperty(cleanFieldName)) {
                          // This is a duplicate - store all values
                          if (!duplicateTracker[cleanFieldName]) {
                            duplicateTracker[cleanFieldName] = [properData[cleanFieldName]]
                          }
                          duplicateTracker[cleanFieldName].push(value)
                          console.log(`🔍 Duplicate field detected: "${cleanFieldName}" with values:`, duplicateTracker[cleanFieldName])
                        } else {
                          properData[cleanFieldName] = value
                        }
                      }
                    }
                  })
                  
                  // Add duplicate information to the data
                  if (Object.keys(duplicateTracker).length > 0) {
                    (properData as any)._duplicates = duplicateTracker
                    console.log('📝 Stored duplicates for later processing:', duplicateTracker)
                  }
                }
                
                console.log('✅ Reconstructed proper data structure:', properData)
                
                // Extract field descriptions from rows 6-7 (index 5-6) - only for specific templates
                const fieldDescriptions: Record<string, string> = {}
                
                // Check if this file has the template structure with descriptions
                // Look for "Beschreibung" marker in row 5 (index 4)
                const hasDescriptionMarker = rawData.length >= 5 && 
                  rawData[4] && 
                  rawData[4].some((cell: any) => 
                    cell && typeof cell === 'string' && cell.toLowerCase().includes('beschreibung')
                  )
                
                if (hasDescriptionMarker && rawData.length >= 6) {
                  console.log('📝 Found template with descriptions - extracting field descriptions from rows 6-7...')
                  
                  // Row 6 (index 5) and Row 7 (index 6) contain descriptions
                  const descRow1 = rawData[5] || []
                  const descRow2 = rawData[6] || []
                  
                  console.log('📚 Description row 6:', descRow1)
                  console.log('📚 Description row 7:', descRow2)
                  
                  // Map descriptions to field names by column position
                  fieldNamesRow.forEach((fieldName: string, index: number) => {
                    if (fieldName && fieldName.trim() !== '') {
                      let description = ''
                      
                      // Get description from row 6
                      if (index < descRow1.length && descRow1[index]) {
                        description += String(descRow1[index]).trim()
                      }
                      
                      // Add description from row 7 if exists
                      if (index < descRow2.length && descRow2[index]) {
                        if (description) description += ' '
                        description += String(descRow2[index]).trim()
                      }
                      
                      if (description) {
                        fieldDescriptions[fieldName.trim()] = description
                        console.log(`📚 Field description: "${fieldName}" = "${description}"`)
                      }
                    }
                  })
                } else {
                  console.log('ℹ️ No description template detected - skipping field descriptions extraction')
                }
                
                // Replace the problematic data with properly structured data
                if (Object.keys(properData).length > 0) {
                  jsonData = [properData]
                  
                  // Store field descriptions for later use
                  if (Object.keys(fieldDescriptions).length > 0) {
                    console.log('💾 Storing field descriptions for AI training:', fieldDescriptions)
                    // We'll need to pass this to the template parser
                    ;(jsonData as any)._fieldDescriptions = fieldDescriptions
                  }
                }
              }
            }
            
            console.log('🔍 Raw Excel data (first 3 rows):', jsonData.slice(0, 3))
            console.log('🏷️ Original headers:', Object.keys(jsonData[0] || {}))
            
            const { cleanedData, fieldDescriptions } = cleanExcelData(jsonData)
            jsonData = cleanedData
            extractedFieldDescriptions = fieldDescriptions
            
            // Store field descriptions for AI training (if available)
            if (fieldDescriptions && Object.keys(fieldDescriptions).length > 0) {
              console.log('📚 Field descriptions extracted for AI training:', fieldDescriptions)
            }
            
            console.log('✨ Cleaned headers:', Object.keys(jsonData[0] || {}))
            console.log('📊 Final data count:', jsonData.length, 'rows')
          } else if (file.type === 'application/pdf') {
            // For PDF files, we'll create a placeholder entry
            jsonData = [{
              'File Type': 'PDF',
              'File Name': file.name,
              'Note': 'PDF processing not yet implemented. Please convert to Excel/CSV first.'
            }]
          } else if (file.type === 'text/plain') {
            // For text files, we'll create a placeholder entry
            jsonData = [{
              'File Type': 'Text',
              'File Name': file.name,
              'Content': data as string
            }]
          }

          resolve({ data: jsonData, fieldDescriptions: extractedFieldDescriptions })
        } catch (error) {
          reject(new Error(`Failed to process file: ${error}`))
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsBinaryString(file)
    })
  }

  const saveToSupabase = async (file: File, data: any[]): Promise<string | null> => {
    try {
      // Check if Supabase is properly configured
      if (!supabase) {
        console.warn('Supabase not configured. Using local storage only.')
        return `local-${Date.now()}`
      }

      console.log('🔄 Starting Supabase save process...')

      // For now, we'll use a mock user ID since auth isn't implemented yet
      const mockUserId = '96e65406-f077-4709-8671-2f092c9f7bfb'

      // Create project
      console.log('📝 Creating project in database...')
      const project = await projectService.createProject({
        name: file.name,
        user_id: mockUserId,
        status: 'processing',
        file_name: file.name,
        file_size: file.size,
        total_rows: data.length
      })

      if (!project) {
        throw new Error('Failed to create project')
      }

      console.log('✅ Project created:', project.id)

      // Upload file to Supabase Storage
      console.log('📤 Uploading file to Supabase Storage...')
      const filePath = await fileUploadService.uploadFile(file, project.id)
      
      if (!filePath) {
        console.warn('⚠️ Failed to upload file to storage. Continuing with database only.')
      } else {
        console.log('✅ File uploaded to Supabase Storage:', filePath)
        
        // Test if we can get the public URL
        const publicUrl = fileUploadService.getFileUrl(filePath)
        console.log('🔗 Public URL:', publicUrl)
      }

      // Save product data to database
      console.log('💾 Saving product data to database...')
      const productDataEntries = data.map((row, index) => ({
        project_id: project.id,
        row_number: index + 1,
        source_data: row,
        mapped_data: null,
        validation_status: 'pending' as const,
        quality_score: 0
      }))

      const savedProductData = await productDataService.createProductData(productDataEntries)
      if (!savedProductData.length) {
        throw new Error('Failed to save product data')
      }

      console.log('✅ Product data saved:', savedProductData.length, 'rows')

      // Update project status
      console.log('🔄 Updating project status to completed...')
      await projectService.updateProjectStatus(project.id, 'completed')

      console.log('🎉 Supabase save process completed successfully!')
      return project.id
    } catch (error) {
      console.error('❌ Error saving to Supabase:', error)
      // Fallback to local storage
      return `local-${Date.now()}`
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        let errorMessage = 'File rejected: '
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            errorMessage += 'File is too large (max 50MB). '
          } else if (error.code === 'file-invalid-type') {
            errorMessage += 'File type not supported. '
          } else {
            errorMessage += error.message + ' '
          }
        })
        
        setUploadedFiles(prev => [...prev, {
          file,
          status: 'error',
          progress: 0,
          error: errorMessage.trim()
        }])
      })
    }

    // Process accepted files
    for (const file of acceptedFiles) {
      // Add file to list with uploading status
      setUploadedFiles(prev => [...prev, {
        file,
        status: 'uploading',
        progress: 0
      }])

      try {
        // Simulate upload progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100))
          setUploadedFiles(prev =>
            prev.map(f =>
              f.file === file
                ? { ...f, progress: i }
                : f
            )
          )
        }

        // Update status to processing
        setUploadedFiles(prev =>
          prev.map(f =>
            f.file === file
              ? { ...f, status: 'processing' }
              : f
          )
        )

        // Process the file
        const result = await processFile(file)
        const { data, fieldDescriptions } = result

        // Save to Supabase (or local storage as fallback)
        const projectId = await saveToSupabase(file, data)

        if (projectId) {
          setUploadedFiles(prev =>
            prev.map(f =>
              f.file === file
                ? { ...f, status: 'completed', data, projectId }
                : f
            )
          )

          // Call the callback with processed data and field descriptions
          onFileProcessed(data, file.name, projectId, fieldDescriptions)
        } else {
          throw new Error('Failed to save data')
        }

      } catch (error) {
        console.error('Error processing file:', error)
        setUploadedFiles(prev =>
          prev.map(f =>
            f.file === file
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
              : f
          )
        )
      }
    }
  }, [onFileProcessed])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true
  })

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prev => prev.filter(f => f.file !== fileToRemove))
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to select files
        </p>
        <p className="text-xs text-gray-400">
          Supported formats: Excel (.xlsx, .xls), CSV, JSON, PDF, TXT (max 50MB)
        </p>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>
          {uploadedFiles.map((uploadedFile, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <File className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Status and Progress */}
                <div className="flex items-center space-x-2">
                  {uploadedFile.status === 'uploading' && (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-sm text-blue-600">
                        Uploading... {uploadedFile.progress}%
                      </span>
                    </>
                  )}
                  
                  {uploadedFile.status === 'processing' && (
                    <>
                      <div className="w-4 h-4 border-2 border-yellow-200 border-t-yellow-600 rounded-full animate-spin"></div>
                      <span className="text-sm text-yellow-600">Processing...</span>
                    </>
                  )}
                  
                  {uploadedFile.status === 'completed' && (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Completed</span>
                      {uploadedFile.data && (
                        <span className="text-xs text-gray-500">
                          ({uploadedFile.data.length} rows)
                        </span>
                      )}
                    </>
                  )}
                  
                  {uploadedFile.status === 'error' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">
                        {uploadedFile.error || 'Error'}
                      </span>
                    </>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadedFile.file)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 