'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  BarChart3,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldMappingResult } from '@/lib/ai-field-mapping'
import { targetFieldService, type TargetField } from '@/lib/supabase-services'
import { aiProductNameService, type ProductNameResult } from '@/lib/ai-product-name-generation'

interface ProcessedData {
  data: any[]
  fileName: string
  projectId: string
  timestamp: Date
  mappings?: FieldMappingResult[]
  fieldDescriptions?: Record<string, string>
}

interface QualityMetrics {
  totalFields: number
  completeFields: number
  incompleteFields: number
  criticalFields: number
  avgConfidence: number
  qualityScore: number
}

interface DataQualityDashboardProps {
  processedFiles: ProcessedData[]
}

type QualityStatus = 'complete' | 'missing' | 'critical' | 'duplicate' | 'needs_work'
type SortField = 'fieldName' | 'confidence' | 'quality' | 'value'
type SortDirection = 'asc' | 'desc'
type FilterStatus = 'complete' | 'missing' | 'critical' | 'duplicate'

interface FieldQuality {
  fieldName: string
  sourceValue: any
  targetField: string
  confidence: number
  status: QualityStatus
  reason: string
  hasValue: boolean
  isRequired: boolean
  isDuplicate: boolean
  duplicateCount?: number
}

export function DataQualityDashboard({ processedFiles }: DataQualityDashboardProps) {
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<FilterStatus[]>(['complete', 'missing', 'critical', 'duplicate'])
  const [showNeedsWork, setShowNeedsWork] = useState(false)
  const [sortField, setSortField] = useState<SortField>('fieldName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [targetFields, setTargetFields] = useState<TargetField[]>([])
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [generatedProductName, setGeneratedProductName] = useState<ProductNameResult | null>(null)
  const [isGeneratingName, setIsGeneratingName] = useState(false)

  // Load target fields from Supabase on component mount
  useEffect(() => {
    const loadTargetFields = async () => {
      setLoading(true)
      try {
        const fields = await targetFieldService.getTargetFields()
        setTargetFields(fields)
        console.log('📋 Loaded target fields from Supabase:', fields.length, fields)
      } catch (error) {
        console.error('❌ Failed to load target fields:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTargetFields()
  }, [])

  // Get selected file data
  const selectedData = useMemo(() => {
    if (!selectedFile) return null
    return processedFiles.find(f => f.fileName === selectedFile) || null
  }, [selectedFile, processedFiles])

  // Calculate field quality for selected file
  const fieldQualities = useMemo((): FieldQuality[] => {
    if (!selectedFile || targetFields.length === 0) return []
    
    const file = processedFiles.find(f => f.fileName === selectedFile)
    if (!file || !file.mappings || !file.data?.[0]) return []

    const sourceData = file.data[0]
    const requiredFieldNames = targetFields.map(tf => tf.field_name)
    
    // Check for duplicates in target fields
    const targetFieldCounts: Record<string, number> = {}
    file.mappings.forEach(mapping => {
      targetFieldCounts[mapping.targetField] = (targetFieldCounts[mapping.targetField] || 0) + 1
    })
    
    return file.mappings.map(mapping => {
      const sourceValue = sourceData[mapping.sourceField]
      const hasValue = sourceValue !== null && 
                      sourceValue !== undefined && 
                      String(sourceValue).trim() !== '' &&
                      String(sourceValue).trim() !== '-'
      
      const isRequired = requiredFieldNames.includes(mapping.targetField)
      const isDuplicate = targetFieldCounts[mapping.targetField] > 1
      const duplicateCount = targetFieldCounts[mapping.targetField]
      
      let status: QualityStatus
      if (isDuplicate) {
        status = 'duplicate'
      } else if (!hasValue && isRequired) {
        status = 'critical'
      } else if (!hasValue) {
        status = 'missing'
      } else {
        status = 'complete'
      }

      return {
        fieldName: mapping.sourceField,
        sourceValue,
        targetField: mapping.targetField,
        confidence: mapping.confidence,
        status,
        reason: isDuplicate ? `Duplicate mapping (${duplicateCount}x) - manual selection required` : mapping.reason,
        hasValue,
        isRequired,
        isDuplicate,
        duplicateCount: isDuplicate ? duplicateCount : undefined
      }
    })
  }, [selectedFile, processedFiles, targetFields])

  // Check for missing required fields
  const missingRequiredFields = useMemo(() => {
    if (targetFields.length === 0) return []
    
    const mappedTargetFields = fieldQualities.map(f => f.targetField)
    return targetFields.filter(tf => !mappedTargetFields.includes(tf.field_name))
  }, [targetFields, fieldQualities])

  // Separate required and additional fields
  const requiredFields = useMemo(() => {
    // Get all mapped fields that map to required target fields
    const mappedRequiredFields = fieldQualities.filter(f => f.isRequired)
    
    // Create entries for missing required fields
    const missingRequiredEntries: FieldQuality[] = missingRequiredFields.map(tf => ({
      fieldName: '(Missing)',
      sourceValue: null,
      targetField: tf.field_name,
      confidence: 0,
      status: 'critical' as QualityStatus,
      reason: 'Required field not mapped',
      hasValue: false,
      isRequired: true,
      isDuplicate: false
    }))
    
    return [...mappedRequiredFields, ...missingRequiredEntries]
  }, [fieldQualities, missingRequiredFields])
  
  const additionalFields = useMemo(() => 
    fieldQualities.filter(f => !f.isRequired), [fieldQualities]
  )

  // Calculate quality metrics
  const qualityMetrics = useMemo((): QualityMetrics => {
    const totalFields = fieldQualities.length + missingRequiredFields.length
    const completeFields = fieldQualities.filter(f => f.status === 'complete').length
    const incompleteFields = fieldQualities.filter(f => f.status === 'missing' || f.status === 'duplicate').length
    const criticalFields = fieldQualities.filter(f => f.status === 'critical').length + missingRequiredFields.length
    const avgConfidence = fieldQualities.length > 0 
      ? fieldQualities.reduce((sum, f) => sum + f.confidence, 0) / fieldQualities.length 
      : 0
    const totalRequiredFields = targetFields.length
    const completeRequiredFields = requiredFields.filter(f => f.status === 'complete').length
    const qualityScore = totalRequiredFields > 0 
      ? (completeRequiredFields / totalRequiredFields) * 100 
      : 0

    return {
      totalFields,
      completeFields,
      incompleteFields,
      criticalFields,
      avgConfidence,
      qualityScore
    }
  }, [fieldQualities, missingRequiredFields, targetFields, requiredFields])

  // Apply filtering and sorting to both required and additional fields
  const getFilteredAndSortedFields = (fields: FieldQuality[]) => {
    let filtered = [...fields]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.fieldName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.targetField.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(f.sourceValue).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply "Needs Work" filter (all non-complete)
    if (showNeedsWork) {
      filtered = filtered.filter(f => f.status !== 'complete')
    } else {
      // Apply specific status filters - only show selected statuses
      if (selectedFilters.length > 0 && selectedFilters.length < 4) {
        filtered = filtered.filter(f => selectedFilters.includes(f.status))
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortField) {
        case 'fieldName':
          aValue = a.fieldName
          bValue = b.fieldName
          break
        case 'confidence':
          aValue = a.confidence
          bValue = b.confidence
          break
        case 'quality':
          const statusOrder = { 'critical': 0, 'missing': 1, 'duplicate': 2, 'complete': 3 }
          aValue = statusOrder[a.status]
          bValue = statusOrder[b.status]
          break
        case 'value':
          aValue = String(a.sourceValue || '')
          bValue = String(b.sourceValue || '')
          break
        default:
          aValue = a.fieldName
          bValue = b.fieldName
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    })

    return filtered
  }

  const filteredRequiredFields = useMemo(() => getFilteredAndSortedFields(requiredFields), 
    [requiredFields, searchTerm, selectedFilters, showNeedsWork, sortField, sortDirection])
  
  const filteredAdditionalFields = useMemo(() => getFilteredAndSortedFields(additionalFields), 
    [additionalFields, searchTerm, selectedFilters, showNeedsWork, sortField, sortDirection])

  // Get quality status styling
  const getQualityBadge = (status: QualityStatus) => {
    const configs = {
      'complete': { 
        variant: 'default' as const, 
        icon: CheckCircle, 
        text: 'Complete',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      'duplicate': { 
        variant: 'secondary' as const, 
        icon: AlertTriangle, 
        text: 'Duplicate',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      'missing': { 
        variant: 'outline' as const, 
        icon: XCircle, 
        text: 'Missing',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      },
      'critical': { 
        variant: 'destructive' as const, 
        icon: XCircle, 
        text: 'Critical',
        className: 'bg-red-100 text-red-800 border-red-200'
      }
    }
    
    const config = configs[status]
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 font-semibold'
    if (confidence >= 0.7) return 'text-yellow-600 font-medium'
    return 'text-red-600 font-medium'
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  // Filter management functions
  const toggleFilter = (status: FilterStatus) => {
    setSelectedFilters(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status)
      } else {
        return [...prev, status]
      }
    })
  }

  const selectAllFilters = () => {
    setSelectedFilters(['complete', 'duplicate', 'missing', 'critical'])
    setShowNeedsWork(false)
  }

  const clearAllFilters = () => {
    setSelectedFilters([])
    setShowNeedsWork(false)
  }

  const toggleNeedsWork = () => {
    setShowNeedsWork(!showNeedsWork)
    if (!showNeedsWork) {
      // When enabling "Needs Work", clear other filters
      setSelectedFilters([])
    }
  }

  // Handle inline editing
  const startEditing = (fieldName: string, currentValue: string) => {
    setEditingField(fieldName)
    setEditingValue(currentValue)
  }

  const saveEdit = (fieldName: string) => {
    console.log(`💾 Saving edit for ${fieldName}: ${editingValue}`)
    // Here you would update the actual data
    // For now, just log the change
    setEditingField(null)
    setEditingValue('')
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditingValue('')
  }

  // Toggle field type between Required and Optional
  const toggleFieldType = (fieldName: string) => {
    console.log(`🔄 Toggling field type for: ${fieldName}`)
    // This would update the mappings in the selected data
    // For now, just log the action
  }

  // Remove field (only for Optional fields)
  const removeField = (fieldName: string) => {
    console.log(`🗑️ Removing field: ${fieldName}`)
    // This would remove the field from the mappings
    // For now, just log the action
  }

  // Generate product name using AI
  const generateProductName = async () => {
    if (!selectedData || selectedData.data.length === 0) {
      console.warn('No data selected for product name generation')
      return
    }

    setIsGeneratingName(true)
    try {
      const productData = selectedData.data[0] // Use first row of data
      const brand = productData['Producer Name'] || productData['Brand'] || ''
      const description = productData['Product Description'] || productData['Description'] || ''
      const category = productData['Custom Category'] || productData['Category'] || ''

      console.log('🎯 Generating product name for:', { brand, description, category })

      const result = await aiProductNameService.generateProductName({
        productData,
        brand,
        description,
        category
      })

      setGeneratedProductName(result)
      console.log('✅ Product name generated:', result)
    } catch (error) {
      console.error('❌ Error generating product name:', error)
    } finally {
      setIsGeneratingName(false)
    }
  }

  const isAllSelected = selectedFilters.length === 4 && !showNeedsWork

  // Render field quality table
  const renderFieldTable = (fields: FieldQuality[], title: string) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('fieldName')}
                className="font-semibold"
              >
                Source Field
                {getSortIcon('fieldName')}
              </Button>
            </th>
            <th className="text-left p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('value')}
                className="font-semibold"
              >
                Value
                {getSortIcon('value')}
              </Button>
            </th>
            <th className="text-left p-3">Target Field</th>
            <th className="text-left p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('confidence')}
                className="font-semibold"
              >
                Confidence
                {getSortIcon('confidence')}
              </Button>
            </th>
            <th className="text-left p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('quality')}
                className="font-semibold"
              >
                Quality Status
                {getSortIcon('quality')}
              </Button>
            </th>
            <th className="text-left p-3">Reason</th>
            <th className="text-left p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, index) => (
            <tr key={`${field.fieldName}-${index}`} className={`border-b hover:bg-gray-50 ${field.isDuplicate ? 'bg-yellow-50' : ''}`}>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{field.fieldName}</span>
                  {field.isRequired && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                  {field.isDuplicate && (
                    <Badge variant="destructive" className="text-xs">
                      Duplicate ({field.duplicateCount}x)
                    </Badge>
                  )}
                </div>
              </td>
              <td className="p-3">
                <div className="max-w-xs">
                  {editingField === field.fieldName ? (
                    <div className="flex gap-2">
                      <Input
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(field.fieldName)
                          if (e.key === 'Escape') cancelEdit()
                        }}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => saveEdit(field.fieldName)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:bg-gray-100 p-1 rounded"
                      onClick={() => startEditing(field.fieldName, field.sourceValue ? String(field.sourceValue) : '')}
                    >
                      {field.hasValue ? (
                        <span className="text-sm">
                          {String(field.sourceValue).length > 50 
                            ? String(field.sourceValue).substring(0, 50) + '...'
                            : String(field.sourceValue)
                          }
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Click to add value</span>
                      )}
                    </div>
                  )}
                </div>
              </td>
              <td className="p-3">
                {!field.isRequired && editingField === `target-${field.fieldName}` ? (
                  <div className="flex gap-2">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(`target-${field.fieldName}`)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={() => saveEdit(`target-${field.fieldName}`)}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`text-sm font-medium text-blue-600 ${!field.isRequired ? 'cursor-pointer hover:bg-gray-100 p-1 rounded' : ''}`}
                    onClick={() => !field.isRequired && startEditing(`target-${field.fieldName}`, field.targetField)}
                  >
                    {field.targetField}
                    {!field.isRequired && (
                      <span className="text-xs text-gray-400 ml-1">(click to edit)</span>
                    )}
                  </div>
                )}
              </td>
              <td className="p-3">
                <span className={`text-sm ${getConfidenceColor(field.confidence)}`}>
                  {(field.confidence * 100).toFixed(0)}%
                </span>
              </td>
              <td className="p-3">
                {getQualityBadge(field.status)}
              </td>
              <td className="p-3">
                <span className="text-sm text-gray-600">
                  {field.reason}
                </span>
              </td>
              <td className="p-3">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleFieldType(field.fieldName)}
                    className="text-xs px-2 py-1"
                  >
                    {field.isRequired ? '→ Optional' : '→ Required'}
                  </Button>
                  {!field.isRequired && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeField(field.fieldName)}
                      className="text-xs px-2 py-1"
                    >
                      ✕ Remove
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {fields.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No {title.toLowerCase()} fields available.
        </div>
      )}
    </div>
  )

  useEffect(() => {
    if (processedFiles.length > 0 && !selectedFile) {
      setSelectedFile(processedFiles[0].fileName)
    }
  }, [processedFiles, selectedFile])

  if (processedFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Data Quality Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No processed files available. Please upload and process some data first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Data Quality Dashboard
          </CardTitle>
        </CardHeader>
      </Card>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select File</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedFile} onValueChange={setSelectedFile}>
            <SelectTrigger>
              <SelectValue placeholder="Select a processed file" />
            </SelectTrigger>
            <SelectContent>
              {processedFiles.map((file) => (
                <SelectItem key={file.fileName} value={file.fileName}>
                  {file.fileName} ({file.mappings?.length || 0} mappings)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Product Name Generation */}
      {selectedFile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏷️ AI Product Name Generation
            </CardTitle>
            <p className="text-sm text-gray-600">
              Generate consistent product names using AI based on your product data.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button
                onClick={generateProductName}
                disabled={isGeneratingName || !selectedData}
                className="w-full"
              >
                {isGeneratingName ? 'Generating...' : 'Generate Product Name'}
              </Button>
              
              {generatedProductName && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-green-800">Generated Name:</label>
                      <p className="text-lg font-semibold text-green-900">
                        {generatedProductName.generatedName}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-green-800">Confidence:</label>
                      <span className="ml-2 text-sm text-green-700">
                        {(generatedProductName.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-green-800">Reasoning:</label>
                      <p className="text-sm text-green-700">{generatedProductName.reasoning}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-green-800">Format:</label>
                      <span className="ml-2 text-sm text-green-700">{generatedProductName.format}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Copy to clipboard or apply to Portal Name field
                        navigator.clipboard.writeText(generatedProductName.generatedName)
                        console.log('📋 Copied to clipboard:', generatedProductName.generatedName)
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedFile && (
        <>
          {/* Quality Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Quality Score</p>
                    <p className="text-2xl font-bold text-green-600">
                      {qualityMetrics.qualityScore.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                    <p className={`text-2xl font-bold ${getConfidenceColor(qualityMetrics.avgConfidence)}`}>
                      {(qualityMetrics.avgConfidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Complete Fields</p>
                    <p className="text-2xl font-bold text-green-600">
                      {qualityMetrics.completeFields}/{qualityMetrics.totalFields}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Critical Issues</p>
                    <p className="text-2xl font-bold text-red-600">
                      {qualityMetrics.criticalFields}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search fields, values, or mappings..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Multi-Select Status Filters */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllFilters}
                        disabled={isAllSelected}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                        disabled={selectedFilters.length === 0}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Needs Work Filter - Special filter for all non-complete */}
                    <div className="flex items-center space-x-2 p-2 bg-orange-50 border border-orange-200 rounded">
                      <Checkbox
                        id="filter-needs-work"
                        checked={showNeedsWork}
                        onCheckedChange={toggleNeedsWork}
                      />
                      <label
                        htmlFor="filter-needs-work"
                        className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                        Needs Work (All non-complete)
                      </label>
                    </div>

                    {/* Individual Status Filters */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="filter-complete"
                          checked={selectedFilters.includes('complete') && !showNeedsWork}
                          onCheckedChange={() => toggleFilter('complete')}
                          disabled={showNeedsWork}
                        />
                        <label
                          htmlFor="filter-complete"
                          className={`flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${showNeedsWork ? 'opacity-50' : ''}`}
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Complete
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="filter-duplicate"
                          checked={selectedFilters.includes('duplicate') && !showNeedsWork}
                          onCheckedChange={() => toggleFilter('duplicate')}
                          disabled={showNeedsWork}
                        />
                        <label
                          htmlFor="filter-duplicate"
                          className={`flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${showNeedsWork ? 'opacity-50' : ''}`}
                        >
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          Duplicate
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="filter-missing"
                          checked={selectedFilters.includes('missing') && !showNeedsWork}
                          onCheckedChange={() => toggleFilter('missing')}
                          disabled={showNeedsWork}
                        />
                        <label
                          htmlFor="filter-missing"
                          className={`flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${showNeedsWork ? 'opacity-50' : ''}`}
                        >
                          <XCircle className="w-4 h-4 text-gray-600" />
                          Missing
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="filter-critical"
                          checked={selectedFilters.includes('critical') && !showNeedsWork}
                          onCheckedChange={() => toggleFilter('critical')}
                          disabled={showNeedsWork}
                        />
                        <label
                          htmlFor="filter-critical"
                          className={`flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer ${showNeedsWork ? 'opacity-50' : ''}`}
                        >
                          <XCircle className="w-4 h-4 text-red-600" />
                          Critical
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Required: {filteredRequiredFields.length} of {requiredFields.length} fields | 
                    Additional: {filteredAdditionalFields.length} of {additionalFields.length} fields
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required Fields Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Required Fields ({filteredRequiredFields.length}/{requiredFields.length} shown, {targetFields.length} total)
              </CardTitle>
              {missingRequiredFields.length > 0 && (
                <div className="text-sm text-red-600 mt-2">
                  <strong>⚠️ {missingRequiredFields.length} required fields are missing from the mapping</strong>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {renderFieldTable(filteredRequiredFields, 'Required')}
            </CardContent>
          </Card>

          {/* Additional Fields Table */}
          {additionalFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  Additional Fields ({filteredAdditionalFields.length}/{additionalFields.length} shown)
                </CardTitle>
                <div className="text-sm text-gray-600 mt-1">
                  Fields that don't match any required target field but were mapped automatically
                </div>
              </CardHeader>
              <CardContent>
                {renderFieldTable(filteredAdditionalFields, 'Additional')}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}