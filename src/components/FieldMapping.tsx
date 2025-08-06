'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { ArrowRight, CheckCircle, AlertCircle, RefreshCw, Save } from 'lucide-react'
import { targetFieldService, fieldMappingService, optionalFieldService } from '@/lib/supabase-services'
import { aiFieldMappingService, FieldMappingResult } from '@/lib/ai-field-mapping'
import { TargetField } from '@/lib/supabase'

interface FieldMappingProps {
  sourceData: any[]
  projectId: string
  fieldDescriptions?: Record<string, string>
  onMappingComplete: (mappings: FieldMappingResult[]) => void
}

export function FieldMapping({ sourceData, projectId, fieldDescriptions, onMappingComplete }: FieldMappingProps) {
  const [sourceFields, setSourceFields] = useState<string[]>([])
  const [targetFields, setTargetFields] = useState<TargetField[]>([])
  const [mappings, setMappings] = useState<FieldMappingResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<Record<string, string[]>>({})

  // Categorize mappings into required and optional with duplicate detection
  const categorizedMappings = React.useMemo(() => {
    // Use AI-determined classification if available, otherwise fall back to target field matching
    const requiredMappings = mappings.filter(m => {
      if (m.isRequired !== undefined) return m.isRequired
      // Fallback: check if target field is in required list
      const requiredFieldNames = targetFields.map(tf => tf.field_name)
      return requiredFieldNames.includes(m.targetField)
    })
    
    const optionalMappings = mappings.filter(m => {
      if (m.isOptional !== undefined) return m.isOptional
      // Fallback: check if target field is NOT in required list
      const requiredFieldNames = targetFields.map(tf => tf.field_name)
      return !requiredFieldNames.includes(m.targetField)
    })
    
    // Detect target field duplicates across both categories
    const requiredTargetFields = requiredMappings.map(m => m.targetField)
    const optionalTargetFields = optionalMappings.map(m => m.targetField)
    const allTargetFields = [...requiredTargetFields, ...optionalTargetFields]
    
    const targetFieldDuplicates: Record<string, { requiredCount: number, optionalCount: number }> = {}
    allTargetFields.forEach(targetField => {
      const requiredCount = requiredTargetFields.filter(f => f === targetField).length
      const optionalCount = optionalTargetFields.filter(f => f === targetField).length
      
      if (requiredCount + optionalCount > 1) {
        targetFieldDuplicates[targetField] = { requiredCount, optionalCount }
        console.log(`🔍 Duplicate detected: "${targetField}" appears ${requiredCount} times in Required and ${optionalCount} times in Optional`)
      }
    })
    
    if (Object.keys(targetFieldDuplicates).length > 0) {
      console.warn('⚠️ Target field duplicates detected:', targetFieldDuplicates)
    } else {
      console.log('✅ No target field duplicates found')
    }
    
    console.log('🔍 Categorizing mappings:', {
      totalMappings: mappings.length,
      requiredMappings: requiredMappings.length,
      optionalMappings: optionalMappings.length,
      targetFieldsCount: targetFields.length,
      targetFieldDuplicates: Object.keys(targetFieldDuplicates).length
    })
    
    return { requiredMappings, optionalMappings, targetFieldDuplicates }
  }, [mappings, targetFields])

  // Extract source fields from data and detect duplicates
  useEffect(() => {
    if (sourceData && sourceData.length > 0) {
      const fields = Object.keys(sourceData[0]).filter(key => 
        key && typeof key === 'string' && key.trim() !== ''
      )
      console.log('📊 Source fields extracted:', fields.length, fields)
      setSourceFields(fields)
      
      // Detect duplicate values across all fields
      const detectedDuplicates: Record<string, string[]> = {}
      
      for (const field of fields) {
        const values = sourceData.map(row => row[field]).filter(val => val && val.toString().trim() !== '')
        const uniqueValues = Array.from(new Set(values.map(v => v.toString())))
        
        // If we have multiple different values for the same field name, it might be duplicates
        if (uniqueValues.length > 1) {
          detectedDuplicates[field] = uniqueValues
          console.log(`🔍 Potential duplicates found for "${field}":`, uniqueValues)
        }
      }
      
      setDuplicates(detectedDuplicates)
    } else {
      console.log('⚠️ No source data provided')
    }
  }, [sourceData])

  // Load target fields
  useEffect(() => {
    const loadTargetFields = async () => {
      try {
        console.log('🎯 Loading target fields...')
        const fields = await targetFieldService.getTargetFields()
        console.log('📋 Target fields loaded:', fields.length, fields.slice(0, 3))
        
        if (fields.length === 0) {
          setError('No target fields found. Please check your Supabase configuration and RLS policies.')
        } else {
          setTargetFields(fields)
          setError(null)
        }
      } catch (error) {
        console.error('❌ Error loading target fields:', error)
        setError('Failed to load target fields. Please check your Supabase connection.')
      }
    }

    loadTargetFields()
  }, [])

  // Perform AI mapping
  const performAIMapping = async () => {
    console.log('🤖 Starting AI mapping...', {
      sourceFields: sourceFields.length,
      targetFields: targetFields.length
    })
    
    if (sourceFields.length === 0 || targetFields.length === 0) {
      const errorMsg = `Missing fields: source=${sourceFields.length}, target=${targetFields.length}`
      console.error('❌', errorMsg)
      setError(errorMsg)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const mappingRequest = {
        sourceFields,
        targetFields,
        fieldDescriptions
      }

      console.log('📤 Sending mapping request:', mappingRequest)
      if (fieldDescriptions && Object.keys(fieldDescriptions).length > 0) {
        console.log('📚 Including field descriptions for AI training:', fieldDescriptions)
      }
      const aiMappings = await aiFieldMappingService.mapFields(mappingRequest)
      console.log('📥 AI mappings received:', aiMappings.length, aiMappings)
      
      setMappings(aiMappings)
      
      if (aiMappings.length > 0) {
        console.log('✅ AI mapping completed successfully')
      } else {
        console.warn('⚠️ No mappings returned from AI service')
        setError('AI service returned no mappings. Please try again or map manually.')
      }
    } catch (error) {
      console.error('❌ Error performing AI mapping:', error)
      setError(`Failed to perform AI mapping: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Update a single mapping
  const updateMapping = (sourceField: string, targetField: string) => {
    setMappings(prev => prev.map(mapping => 
      mapping.sourceField === sourceField 
        ? { ...mapping, targetField, confidence: 1.0, reason: 'Manual override' }
        : mapping
    ))
  }

  // Save mappings to database
  const saveMappings = async () => {
    setIsSaving(true)
    setError(null)

    try {
      // Separate required and optional mappings
      const requiredMappings = mappings.filter(m => m.isRequired)
      const optionalMappings = mappings.filter(m => m.isOptional)

      console.log(`💾 Saving ${requiredMappings.length} required and ${optionalMappings.length} optional mappings`)

      // Save required mappings to field_mappings table
      if (requiredMappings.length > 0) {
        const fieldMappings = requiredMappings.map(mapping => ({
          project_id: projectId,
          source_field: mapping.sourceField,
          target_field: mapping.targetField,
          confidence_score: mapping.confidence,
          is_manual: mapping.reason === 'Manual override'
        }))

        await fieldMappingService.createFieldMappings(fieldMappings)
      }

      // Save optional mappings to optional_fields table
      if (optionalMappings.length > 0) {
        const optionalFields = optionalMappings.map(mapping => ({
          project_id: projectId,
          source_field: mapping.sourceField,
          source_value: '', // Will be filled from actual data later
          target_field: mapping.targetField === mapping.sourceField ? undefined : mapping.targetField,
          field_type: 'text',
          confidence_score: mapping.confidence,
          is_mapped: mapping.targetField !== mapping.sourceField,
          is_suggested: true,
          suggested_target: mapping.targetField !== mapping.sourceField ? mapping.targetField : undefined,
          reason: mapping.reason || 'AI classified as optional field'
        }))

        await optionalFieldService.createOptionalFields(optionalFields)
      }

      onMappingComplete(mappings)
    } catch (error) {
      console.error('Error saving mappings:', error)
      setError('Failed to save mappings')
    } finally {
      setIsSaving(false)
    }
  }

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  // Get confidence text
  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.6) return 'Medium'
    return 'Low'
  }

  // Handle duplicate value selection
  const handleDuplicateSelection = (fieldName: string, selectedValue: string) => {
    console.log(`🔧 User selected value "${selectedValue}" for duplicate field "${fieldName}"`)
    // Remove field from duplicates after selection
    const newDuplicates = { ...duplicates }
    delete newDuplicates[fieldName]
    setDuplicates(newDuplicates)
    
    // Update the source data to use the selected value
    // This would need to be implemented based on how you want to handle the data
    // For now, just log the selection
  }

  // Toggle mapping between required and optional
  const toggleMappingType = (sourceField: string) => {
    console.log(`🔄 Toggling mapping type for: ${sourceField}`)
    setMappings(prevMappings => 
      prevMappings.map(mapping => {
        if (mapping.sourceField === sourceField) {
          return {
            ...mapping,
            isRequired: !mapping.isRequired,
            isOptional: !mapping.isOptional,
            reason: `${mapping.reason} (user toggled)`
          }
        }
        return mapping
      })
    )
  }

  // Remove mapping completely
  const removeMapping = (sourceField: string) => {
    console.log(`🗑️ Removing mapping for: ${sourceField}`)
    setMappings(prevMappings => 
      prevMappings.filter(mapping => mapping.sourceField !== sourceField)
    )
  }

  // Render duplicate selection UI
  const renderDuplicateSelection = (fieldName: string, values: string[]) => (
    <Card className="mt-4 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          ⚠️ Duplicate Values Detected: {fieldName}
        </CardTitle>
        <p className="text-sm text-orange-600">
          Multiple different values found for this field. Please select the correct value to use.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm font-medium">Bitte korrekten Wert auswählen:</p>
          <Select onValueChange={(value) => handleDuplicateSelection(fieldName, value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Wählen Sie den korrekten Wert aus..." />
            </SelectTrigger>
            <SelectContent>
              {values.map((value, index) => (
                <SelectItem key={index} value={value}>
                  {value || '(Leer)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )

  // Render mapping table for a category
  const renderMappingTable = (mappings: FieldMappingResult[], title: string, isRequired: boolean) => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isRequired ? (
            <span className="text-red-600">🔴 {title} ({mappings.length}/{targetFields.length})</span>
          ) : (
            <span className="text-blue-600">🔵 {title} ({mappings.length})</span>
          )}
        </CardTitle>
        <p className="text-sm text-gray-600">
          {isRequired 
            ? 'These fields are required for the system. All should be mapped.'
            : 'These fields were mapped but don\'t match required target fields. You can adjust or remove them.'
          }
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mappings.map((mapping, index) => {
            const isDuplicate = categorizedMappings.targetFieldDuplicates[mapping.targetField]
            return (
            <div 
              key={`${title}-${index}`}
              className={`flex items-center justify-between p-4 rounded-lg ${
                isDuplicate 
                  ? 'bg-yellow-50 border-2 border-yellow-400' 
                  : isRequired ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
              }`}
            >
              {/* Source Field */}
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {mapping.sourceField}
                </div>
                <div className="text-sm text-gray-500">
                  Source Field
                </div>
              </div>

              <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />

              {/* Target Field Selection */}
              <div className="flex-1">
                {isRequired ? (
                  <Select
                    value={mapping.targetField}
                    onValueChange={(value) => updateMapping(mapping.sourceField, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select target field" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map(field => (
                        <SelectItem key={field.id} value={field.field_name}>
                          <div className="flex items-center gap-2">
                            <span>{field.field_name}</span>
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={mapping.targetField}
                      onChange={(e) => updateMapping(mapping.sourceField, e.target.value)}
                      placeholder="Enter custom target field name"
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500">
                      Custom target field name for optional field
                    </div>
                  </div>
                )}
                <div className="text-sm text-gray-500 mt-1">
                  {isRequired ? 'Required Target Field' : 'Optional Target Field'}
                </div>
              </div>

              {/* Confidence Badge, Duplicate Warning, and Action Buttons */}
              <div className="ml-4 flex flex-col items-end gap-2">
                <div className="flex gap-2 items-center">
                  <Badge className={getConfidenceColor(mapping.confidence)}>
                    {getConfidenceText(mapping.confidence)} ({Math.round(mapping.confidence * 100)}%)
                  </Badge>
                  {isDuplicate && (
                    <Badge variant="destructive" className="text-xs">
                      ⚠️ DUPLICATE
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1 max-w-40 text-right">
                  {mapping.reason}
                  {isDuplicate && (
                    <div className="text-yellow-600 font-medium mt-1">
                      Target field appears in both Required ({isDuplicate.requiredCount}) and Optional ({isDuplicate.optionalCount})
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMappingType(mapping.sourceField)}
                    className="text-xs px-2 py-1"
                  >
                    {isRequired ? '→ Optional' : '→ Required'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeMapping(mapping.sourceField)}
                    className="text-xs px-2 py-1"
                  >
                    ✕ Remove
                  </Button>
                </div>
              </div>
            </div>
            )
          })}
          
          {mappings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No {title.toLowerCase()} mappings available.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (sourceFields.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No source fields found in the uploaded data. Please ensure your file contains column headers.
          </AlertDescription>
        </Alert>
        
        {/* Debug Info */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">🔧 Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <p>Source Data Length: {sourceData?.length || 0}</p>
              <p>Target Fields: {targetFields.length}</p>
              <p>Mappings: {mappings.length}</p>
              <p>Component Version: Updated with Required/Optional separation</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Field Mapping
          </CardTitle>
          <p className="text-sm text-gray-600">
            Map your source fields to target fields. AI suggestions are provided, but you can adjust them manually.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={performAIMapping} 
              disabled={isLoading || targetFields.length === 0 || sourceFields.length === 0}
              className="flex items-center gap-2"
              title={
                targetFields.length === 0 ? 'Loading target fields...' :
                sourceFields.length === 0 ? 'No source fields detected' :
                'Click to perform AI mapping'
              }
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {isLoading ? 'Mapping...' : 'Auto-Map Fields'}
            </Button>

            {mappings.length > 0 && (
              <Button 
                onClick={saveMappings} 
                disabled={isSaving}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? 'Saving...' : 'Save Mappings'}
              </Button>
            )}
          </div>

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Categorized Field Mappings */}
      {mappings.length > 0 && (
        <>
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Field Mappings Overview</CardTitle>
              <p className="text-sm text-gray-600">
                ✅ AI Mapping completed | {mappings.length} total mappings: {categorizedMappings.requiredMappings.length} required, {categorizedMappings.optionalMappings.length} optional
              </p>
              <p className="text-xs text-green-600">
                Target Fields: {targetFields.length} | Source Fields: {sourceFields.length} | Component: Updated with Required/Optional separation
              </p>
            </CardHeader>
            <CardContent>
              {/* Summary */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <strong>Confidence Summary:</strong>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-green-700">
                      High: {mappings.filter(m => m.confidence >= 0.8).length}
                    </span>
                    <span className="text-yellow-700">
                      Medium: {mappings.filter(m => m.confidence >= 0.6 && m.confidence < 0.8).length}
                    </span>
                    <span className="text-red-700">
                      Low: {mappings.filter(m => m.confidence < 0.6).length}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required Fields Table */}
          {renderMappingTable(categorizedMappings.requiredMappings, 'Required Fields', true)}

          {/* Optional Fields Table */}
          {categorizedMappings.optionalMappings.length > 0 && 
            renderMappingTable(categorizedMappings.optionalMappings, 'Optional Fields', false)
          }

          {/* Duplicate Value Selection */}
          {Object.keys(duplicates).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-800">
                🔍 Duplicate Values Found
              </h3>
              {Object.entries(duplicates).map(([fieldName, values]) => 
                renderDuplicateSelection(fieldName, values)
              )}
            </div>
          )}
        </>
      )}

      {/* Preview of Source Fields */}
      {sourceFields.length > 0 && mappings.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Source Fields Detected ({sourceFields.length})</CardTitle>
            <p className="text-sm text-gray-600">
              These fields were found in your uploaded file. Click "Auto-Map Fields" to get AI suggestions.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {sourceFields.map((field, index) => (
                <Badge key={index} variant="outline" className="justify-center p-2">
                  {field}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}