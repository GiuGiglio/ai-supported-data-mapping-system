'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { projectService, productDataService, fileUploadService } from '@/lib/supabase-services'
import { supabase } from '@/lib/supabase'

interface FileUploadProps {
  onFileProcessed: (data: any[], fileName: string, projectId: string) => void
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

// Helper function to clean Excel data from empty columns and rows
const cleanExcelData = (data: any[]): any[] => {
  if (!data || data.length === 0) return data

  return data.map(row => {
    const cleanedRow: any = {}
    
    Object.keys(row).forEach(key => {
      // Skip empty or invalid keys
      if (!key || 
          key.trim() === '' || 
          key.startsWith('_EMPTY') || 
          key.includes('__EMPTY__')) {
        return
      }
      
      // Clean the key name
      const cleanKey = key.trim()
      if (cleanKey && row[key] !== null && row[key] !== undefined) {
        cleanedRow[cleanKey] = row[key]
      }
    })
    
    return cleanedRow
  }).filter(row => {
    // Filter out completely empty rows
    const values = Object.values(row)
    return values.some(value => 
      value !== null && 
      value !== undefined && 
      String(value).trim() !== ''
    )
  })
}

export function FileUpload({ onFileProcessed }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const processFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          let jsonData: any[] = []

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
            jsonData = cleanExcelData(jsonData)
          } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
            console.log('📊 Processing Excel file:', file.name, 'Type:', file.type)
            const workbook = XLSX.read(data, { type: 'binary' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            console.log('📋 Sheet name:', sheetName)
            
            // Convert with better options to avoid empty column issues
            jsonData = XLSX.utils.sheet_to_json(worksheet, { 
              defval: '',
              blankrows: false,
              raw: false
            })
            
            console.log('🔍 Raw Excel data (first 3 rows):', jsonData.slice(0, 3))
            console.log('🏷️ Original headers:', Object.keys(jsonData[0] || {}))
            
            jsonData = cleanExcelData(jsonData)
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

          resolve(jsonData)
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
        const data = await processFile(file)

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

          // Call the callback with processed data
          onFileProcessed(data, file.name, projectId)
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