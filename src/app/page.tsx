'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { SupabaseDataViewer } from '@/components/SupabaseDataViewer'
import { FieldMapping } from '@/components/FieldMapping'
import { DataQualityDashboard } from '@/components/DataQualityDashboard'
import { Button } from '@/components/ui/button'
import { Download, Eye, EyeOff, Database, ArrowRight, BarChart3 } from 'lucide-react'
import { FieldMappingResult } from '@/lib/ai-field-mapping'

interface ProcessedData {
  data: any[]
  fileName: string
  projectId: string
  timestamp: Date
  mappings?: FieldMappingResult[]
  fieldDescriptions?: Record<string, string> // Field descriptions from Excel template
}

export default function Home() {
  const [processedFiles, setProcessedFiles] = useState<ProcessedData[]>([])
  const [showData, setShowData] = useState<{ [key: string]: boolean }>({})
  const [showMapping, setShowMapping] = useState<{ [key: string]: boolean }>({})
  const [showSupabaseViewer, setShowSupabaseViewer] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)

  const handleFileProcessed = (data: any[], fileName: string, projectId: string, fieldDescriptions?: Record<string, string>) => {
    const newProcessedFile: ProcessedData = {
      data,
      fileName,
      projectId,
      timestamp: new Date(),
      fieldDescriptions
    }
    setProcessedFiles(prev => [...prev, newProcessedFile])
  }

  const toggleDataVisibility = (fileName: string) => {
    setShowData(prev => ({
      ...prev,
      [fileName]: !prev[fileName]
    }))
  }

  const toggleMappingVisibility = (fileName: string) => {
    setShowMapping(prev => ({
      ...prev,
      [fileName]: !prev[fileName]
    }))
  }

  const handleMappingComplete = (fileName: string, mappings: FieldMappingResult[]) => {
    setProcessedFiles(prev => prev.map(file => 
      file.fileName === fileName 
        ? { ...file, mappings }
        : file
    ))
    // Auto-hide mapping after completion
    setShowMapping(prev => ({
      ...prev,
      [fileName]: false
    }))
  }

  const downloadData = (processedFile: ProcessedData) => {
    const jsonString = JSON.stringify(processedFile.data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${processedFile.fileName}_processed.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Mapping System
          </h1>
          <p className="text-lg text-gray-600">
            Upload and process your product data files with Supabase backend
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            <Button
              variant={!showSupabaseViewer && !showDashboard ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setShowSupabaseViewer(false)
                setShowDashboard(false)
              }}
            >
              Upload Files
            </Button>
            <Button
              variant={showDashboard ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setShowDashboard(true)
                setShowSupabaseViewer(false)
              }}
              className="flex items-center"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Quality Dashboard
            </Button>
            <Button
              variant={showSupabaseViewer ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                setShowSupabaseViewer(true)
                setShowDashboard(false)
              }}
              className="flex items-center"
            >
              <Database className="h-4 w-4 mr-2" />
              Supabase Data
            </Button>
          </div>
        </div>

        {/* Content */}
        {showDashboard ? (
          <DataQualityDashboard processedFiles={processedFiles} />
        ) : !showSupabaseViewer ? (
          <>
            {/* File Upload Section */}
            <div className="mb-8">
              <FileUpload onFileProcessed={handleFileProcessed} />
            </div>

            {/* Processed Files Section */}
            {processedFiles.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Processed Files ({processedFiles.length})
                </h2>
                
                {processedFiles.map((processedFile, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg shadow-sm border p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {processedFile.fileName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Processed at {formatTimestamp(processedFile.timestamp)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {processedFile.data.length} rows of data
                        </p>
                        <p className="text-xs text-blue-600">
                          Project ID: {processedFile.projectId}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={processedFile.mappings ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleMappingVisibility(processedFile.fileName)}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          {processedFile.mappings ? 'View Mapping' : 'Map Fields'}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleDataVisibility(processedFile.fileName)}
                        >
                          {showData[processedFile.fileName] ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Hide Data
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              View Data
                            </>
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadData(processedFile)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>

                    {/* Field Mapping */}
                    {showMapping[processedFile.fileName] && (
                      <div className="mt-6">
                        <FieldMapping
                          sourceData={processedFile.data}
                          projectId={processedFile.projectId}
                          fieldDescriptions={processedFile.fieldDescriptions}
                          onMappingComplete={(mappings) => handleMappingComplete(processedFile.fileName, mappings)}
                        />
                      </div>
                    )}

                    {/* Mapping Status */}
                    {processedFile.mappings && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-800 font-medium">
                            ✅ Field mapping completed ({processedFile.mappings.length} fields mapped)
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMapping(prev => ({
                              ...prev,
                              [processedFile.fileName]: true
                            }))}
                            className="text-green-700 hover:text-green-900"
                          >
                            Review Mapping
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Data Preview */}
                    {showData[processedFile.fileName] && (
                      <div className="mt-4">
                        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                            {JSON.stringify(processedFile.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Instructions */}
            {processedFiles.length === 0 && (
              <div className="text-center text-gray-500 mt-12">
                <p className="text-lg mb-2">
                  Upload your first file to get started
                </p>
                <p className="text-sm">
                  Supported formats: Excel (.xlsx, .xls), CSV, JSON, PDF, and text files
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-left max-w-2xl mx-auto text-sm">
                  <h4 className="font-medium text-blue-900 mb-2">AI-Powered Field Mapping</h4>
                  <p className="text-blue-800">
                    After uploading a file, you can use AI to automatically map your source fields to our target schema. 
                    The system will analyze your column headers and suggest the best matches with confidence scores.
                  </p>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Files will be automatically saved to Supabase backend
                </p>
              </div>
            )}
          </>
        ) : (
          <SupabaseDataViewer />
        )}
      </div>
    </div>
  )
} 