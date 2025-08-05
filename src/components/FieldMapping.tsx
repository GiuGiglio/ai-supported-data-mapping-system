'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowRight, CheckCircle, AlertCircle, RefreshCw, Save } from 'lucide-react'
import { targetFieldService, fieldMappingService } from '@/lib/supabase-services'
import { aiFieldMappingService, FieldMappingResult } from '@/lib/ai-field-mapping'
import { TargetField } from '@/lib/supabase'

interface FieldMappingProps {
  sourceData: any[]
  projectId: string
  onMappingComplete: (mappings: FieldMappingResult[]) => void
}

export function FieldMapping({ sourceData, projectId, onMappingComplete }: FieldMappingProps) {
  const [sourceFields, setSourceFields] = useState<string[]>([])
  const [targetFields, setTargetFields] = useState<TargetField[]>([])
  const [mappings, setMappings] = useState<FieldMappingResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Extract source fields from data
  useEffect(() => {
    if (sourceData && sourceData.length > 0) {
      const fields = Object.keys(sourceData[0]).filter(key => 
        key && typeof key === 'string' && key.trim() !== ''
      )
      setSourceFields(fields)
    }
  }, [sourceData])

  // Load target fields
  useEffect(() => {
    const loadTargetFields = async () => {
      try {
        const fields = await targetFieldService.getTargetFields()
        setTargetFields(fields)
      } catch (error) {
        console.error('Error loading target fields:', error)
        setError('Failed to load target fields')
      }
    }

    loadTargetFields()
  }, [])

  // Perform AI mapping
  const performAIMapping = async () => {
    if (sourceFields.length === 0 || targetFields.length === 0) {
      setError('No source fields or target fields available')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const mappingRequest = {
        sourceFields,
        targetFields
      }

      const aiMappings = await aiFieldMappingService.mapFields(mappingRequest)
      setMappings(aiMappings)
    } catch (error) {
      console.error('Error performing AI mapping:', error)
      setError('Failed to perform AI mapping. Please try manual mapping.')
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
      const fieldMappings = mappings.map(mapping => ({
        project_id: projectId,
        source_field: mapping.sourceField,
        target_field: mapping.targetField,
        confidence_score: mapping.confidence,
        is_manual: mapping.reason === 'Manual override'
      }))

      await fieldMappingService.createFieldMappings(fieldMappings)
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

  if (sourceFields.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No source fields found in the uploaded data. Please ensure your file contains column headers.
        </AlertDescription>
      </Alert>
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
              disabled={isLoading || targetFields.length === 0}
              className="flex items-center gap-2"
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

      {/* Field Mappings */}
      {mappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Field Mappings ({mappings.length})</CardTitle>
            <p className="text-sm text-gray-600">
              Review and adjust the mappings below. Click on the target field dropdown to change it.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mappings.map((mapping, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
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
                            {field.field_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-sm text-gray-500 mt-1">
                      Target Field
                    </div>
                  </div>

                  {/* Confidence Badge */}
                  <div className="ml-4 flex flex-col items-end">
                    <Badge className={getConfidenceColor(mapping.confidence)}>
                      {getConfidenceText(mapping.confidence)} ({Math.round(mapping.confidence * 100)}%)
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1 max-w-40 text-right">
                      {mapping.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <strong>Mapping Summary:</strong>
                </div>
                <div className="flex gap-4">
                  <span className="text-green-700">
                    High Confidence: {mappings.filter(m => m.confidence >= 0.8).length}
                  </span>
                  <span className="text-yellow-700">
                    Medium Confidence: {mappings.filter(m => m.confidence >= 0.6 && m.confidence < 0.8).length}
                  </span>
                  <span className="text-red-700">
                    Low Confidence: {mappings.filter(m => m.confidence < 0.6).length}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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