import { TargetField } from './supabase'

export interface FieldMappingResult {
  sourceField: string
  targetField: string
  confidence: number
  reason: string
}

export interface FieldMappingRequest {
  sourceFields: string[]
  targetFields: TargetField[]
  fieldDescriptions?: Record<string, string> // Field descriptions for better AI understanding
}

/**
 * AI-powered field mapping service that uses intelligent matching
 * to automatically map source fields to target fields
 */
export class AIFieldMappingService {
  private apiKey: string | null

  constructor() {
    console.log('🏗️ AIFieldMappingService constructor called - switching to Gemini')
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || null
    
    console.log('🔑 Gemini API key exists:', !!this.apiKey)
    console.log('🔑 Gemini API key value:', this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'null')
    
    // Development fallback if env vars don't load
    if (!this.apiKey || this.apiKey.trim() === '') {
      this.apiKey = 'AIzaSyAckWtkcTgkx5_WoyRV48BZfsiL0ISAMDc'
      console.log('🔧 Using hardcoded Gemini API key for development')
    } else {
      console.log('✅ Using environment Gemini API key')
    }
    
    console.log('🔑 Final Gemini API key exists:', !!this.apiKey)
    console.log('🔑 Final Gemini API key preview:', this.apiKey ? this.apiKey.substring(0, 15) + '...' : 'null')
  }

  /**
   * Performs intelligent field mapping using AI
   */
  async mapFields(request: FieldMappingRequest): Promise<FieldMappingResult[]> {
    console.log('🔧 AI Field Mapping Service called', {
      sourceFields: request?.sourceFields?.length || 0,
      targetFields: request?.targetFields?.length || 0,
      hasApiKey: !!this.apiKey,
      apiKeyFirst10: this.apiKey ? this.apiKey.substring(0, 10) : 'null'
    })

    // Validate request
    if (!request) {
      console.error('❌ mapFields: request is null or undefined')
      throw new Error('Mapping request is null or undefined')
    }

    if (!request.sourceFields || request.sourceFields.length === 0) {
      console.error('❌ mapFields: sourceFields is empty or null')
      return []
    }

    if (!request.targetFields || request.targetFields.length === 0) {
      console.error('❌ mapFields: targetFields is empty or null')
      console.log('Using fallback mapping due to missing target fields')
      return this.fallbackMapping(request)
    }

    if (!this.apiKey || this.apiKey === 'your-api-key-here' || this.apiKey.trim() === '') {
      console.warn('⚠️ Gemini API key not configured. Using fallback mapping.')
      console.log('API Key status:', this.apiKey)
      return this.fallbackMapping(request)
    }

    try {
      console.log('🚀 Building AI prompts for Gemini...')
      
      let systemPrompt, userPrompt
      try {
        systemPrompt = this.buildSystemPrompt(request.targetFields, request.fieldDescriptions)
      } catch (error) {
        console.error('❌ Error building system prompt:', error)
        throw error
      }
      
      try {
        userPrompt = this.buildUserPrompt(request.sourceFields)
      } catch (error) {
        console.error('❌ Error building user prompt:', error)
        throw error
      }
      
      // Combine system and user prompts for Gemini
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`

      console.log('📤 Calling Gemini API with key:', this.apiKey ? this.apiKey.substring(0, 15) + '...' : 'null')
      
      if (!this.apiKey) {
        throw new Error('API key is null at fetch time')
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: combinedPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        })
      })

      console.log('📥 Gemini API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Gemini API error:', response.status, errorText)
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('🧠 Gemini raw response:', data)
      
      // Extract text from Gemini response
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!responseText) {
        throw new Error('No response text from Gemini')
      }
      
      console.log('📝 Gemini response text:', responseText)
      
      // Parse JSON from response with enhanced error handling
      let aiResult
      let jsonText = responseText.trim() // Define outside try-catch for error handling
      
      try {
        // Sometimes Gemini returns text with code blocks, extract JSON
        
        console.log('🔍 Processing Gemini response text (length: ' + jsonText.length + '):', jsonText.substring(0, 200) + '...')
        
        // Remove markdown code blocks if present (handle incomplete blocks)
        if (jsonText.includes('```json')) {
          console.log('📦 Extracting JSON from ```json``` code block')
          
          // Try complete code block first
          let jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/i)
          if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1].trim()
            console.log('✂️ Extracted JSON from complete code block (length: ' + jsonText.length + ')')
          } else {
            // Handle incomplete code block (missing closing ```)
            console.log('🔧 Incomplete code block detected - extracting from ```json to end')
            const startMatch = jsonText.match(/```json\s*([\s\S]*)/i)
            if (startMatch && startMatch[1]) {
              jsonText = startMatch[1].trim()
              console.log('✂️ Extracted JSON from incomplete code block (length: ' + jsonText.length + ')')
            } else {
              console.warn('⚠️ Found ```json``` but failed to extract any content')
            }
          }
        } else if (jsonText.includes('```')) {
          console.log('📦 Extracting JSON from ``` code block')
          
          // Try complete code block first
          let jsonMatch = jsonText.match(/```\s*([\s\S]*?)\s*```/)
          if (jsonMatch && jsonMatch[1]) {
            jsonText = jsonMatch[1].trim()
            console.log('✂️ Extracted JSON from complete code block (length: ' + jsonText.length + ')')
          } else {
            // Handle incomplete code block (missing closing ```)
            console.log('🔧 Incomplete code block detected - extracting from ``` to end')
            const startMatch = jsonText.match(/```\s*([\s\S]*)/i)
            if (startMatch && startMatch[1]) {
              jsonText = startMatch[1].trim()
              console.log('✂️ Extracted JSON from incomplete code block (length: ' + jsonText.length + ')')
            } else {
              console.warn('⚠️ Found ``` but failed to extract any content')
            }
          }
        }
        
        // Try to find JSON object boundaries if no code blocks
        if (jsonText && !jsonText.startsWith('{') && jsonText.includes('{')) {
          console.log('🔍 Looking for JSON object boundaries')
          const startIndex = jsonText.indexOf('{')
          const endIndex = jsonText.lastIndexOf('}')
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            jsonText = jsonText.substring(startIndex, endIndex + 1)
            console.log('🎯 Extracted JSON object:', jsonText.substring(0, 200) + '...')
          }
        }
        
        // Safety check: ensure jsonText is valid
        if (!jsonText || jsonText.trim() === '') {
          console.error('🚨 No valid JSON text found after all extraction attempts')
          console.log('📋 Original response text:', responseText)
          throw new Error('No valid JSON found in Gemini response')
        }
        
        console.log('🧪 Attempting to parse JSON text (length: ' + jsonText.length + ')')
        
        // Try to repair incomplete JSON if needed
        let repairedJsonText = jsonText
        const trimmedJson = jsonText.trim()
        
        // Check if JSON needs repair
        const needsRepair = !trimmedJson.endsWith('}') || 
                           trimmedJson.endsWith('},') || 
                           !trimmedJson.includes('"mappings"')
        
        if (needsRepair) {
          console.log('🔧 JSON needs repair - analyzing structure...')
          console.log('🔍 JSON ends with:', trimmedJson.substring(trimmedJson.length - 20))
          
          // Strategy 1: Remove trailing comma and close structure properly
          if (trimmedJson.endsWith('},')) {
            console.log('🔧 Removing trailing comma and closing structure...')
            repairedJsonText = trimmedJson.substring(0, trimmedJson.length - 1) + '\n  ]\n}'
          }
          // Strategy 2: Find last complete mapping and truncate there
          else if (jsonText.includes('"mappings":')) {
            console.log('🔧 Finding last complete mapping...')
            
            // Find all complete mapping objects (those that end with })
            const mappingPattern = /\{\s*"sourceField":[^}]+\}/g
            const completeMatches = Array.from(jsonText.matchAll(mappingPattern))
            
            if (completeMatches.length > 0) {
              const lastMatch = completeMatches[completeMatches.length - 1]
              const lastCompleteIndex = lastMatch.index! + lastMatch[0].length
              
              // Extract up to the last complete mapping
              const upToLastComplete = jsonText.substring(0, lastCompleteIndex)
              repairedJsonText = upToLastComplete + '\n  ]\n}'
              
              console.log(`🔧 Found ${completeMatches.length} complete mappings, truncating after last one`)
            }
          }
          // Strategy 3: Basic structure repair
          else {
            console.log('🔧 Basic structure repair...')
            // Ensure it has the basic structure
            if (!jsonText.includes('"mappings":')) {
              repairedJsonText = '{"mappings":[]}'
            } else {
              // Try to close whatever structure we have
              repairedJsonText = jsonText.replace(/,\s*$/, '') + '\n  ]\n}'
            }
          }
          
          console.log('🔧 Repaired JSON text (last 150 chars):', repairedJsonText.substring(Math.max(0, repairedJsonText.length - 150)))
        }
        
        aiResult = JSON.parse(repairedJsonText)
        console.log('✅ Successfully parsed AI result:', aiResult)
      } catch (parseError) {
        console.error('❌ Failed to parse Gemini JSON response:', parseError)
        console.log('📄 Full raw response text:', responseText)
        console.log('🔧 Attempted JSON text:', jsonText || 'undefined')
        console.log('🔍 Response text starts with:', responseText.substring(0, 50))
        console.log('🔍 Response text ends with:', responseText.substring(responseText.length - 50))
        
        // Try to extract just the mappings array if it exists
        const mappingsMatch = responseText.match(/"mappings"\s*:\s*\[(.*?)\]/s)
        if (mappingsMatch) {
          console.log('🔄 Attempting to extract mappings array directly')
          try {
            const mappingsOnly = '{"mappings":[' + mappingsMatch[1] + ']}'
            aiResult = JSON.parse(mappingsOnly)
            console.log('✅ Successfully parsed mappings-only JSON:', aiResult)
          } catch (mappingsError) {
            console.error('❌ Failed to parse mappings-only JSON:', mappingsError)
            throw new Error('Invalid JSON response from Gemini API')
          }
        } else {
          throw new Error('Invalid JSON response from Gemini API')
        }
      }
      
      const finalMappings = this.parseAIResponse(aiResult, request.sourceFields, request.targetFields)
      console.log('✅ Final mappings:', finalMappings.length, finalMappings)
      
      return finalMappings
    } catch (error: any) {
      console.error('❌ Error in AI field mapping:', error)
      console.log('🔄 Falling back to string similarity mapping...')
      return this.fallbackMapping(request)
    }
  }

  /**
   * Builds the system prompt for the AI
   */
  private buildSystemPrompt(targetFields: TargetField[], fieldDescriptions?: Record<string, string>): string {
    if (!targetFields || targetFields.length === 0) {
      console.error('❌ buildSystemPrompt: targetFields is empty or null')
      throw new Error('Target fields array is empty or null')
    }
    
    const targetFieldNames = targetFields.map(tf => tf?.field_name || 'Unknown').join(', ')
    
    // Build enhanced field descriptions if available
    let fieldDescriptionsText = ''
    if (fieldDescriptions && Object.keys(fieldDescriptions).length > 0) {
      fieldDescriptionsText = '\n\nField Descriptions (IMPORTANT for accurate mapping):\n'
      Object.entries(fieldDescriptions).forEach(([fieldName, description]) => {
        fieldDescriptionsText += `- "${fieldName}": ${description}\n`
      })
      fieldDescriptionsText += '\nUse these descriptions to understand field meanings and map accordingly.\n'
    }
    
    return `You are an expert data mapping AI specialized in mapping product data fields.

Your task is to map source fields from uploaded data files to the correct target fields in our system.

Target fields available in our system:
${targetFieldNames}${fieldDescriptionsText}

Rules for mapping:
1. Map each source field to the most appropriate target field
2. Consider semantic similarity (e.g., "Product Name" → "Portal Name")
3. Consider common variations and synonyms
4. Consider different languages (German/English)
5. Provide confidence score (0-1) for each mapping
6. Provide a brief reason for each mapping
7. If no good match exists, suggest the closest match with low confidence

Examples of good mappings:
- "Product Name", "Title", "Name" → "Portal Name"
- "Brand", "Manufacturer", "Hersteller" → "Producer Name"
- "Description", "Product Description" → "Product Description"
- "Price", "Cost", "Preis", "MSRP", "UVP" → "Initial Suggested Retail Price (SRP) EU"
- "SKU", "Article Number", "Artikelnummer" → "Article Number/SKU"
- "EAN", "Barcode", "GTIN" → "GTIN"
- "Weight", "Gewicht" → "Weight including Outer Carton"
- "Category", "Type", "Produkttyp" → "Custom Category"

Response format must be valid JSON:
{
  "mappings": [
    {
      "sourceField": "source field name",
      "targetField": "target field name",
      "confidence": 0.95,
      "reason": "Exact semantic match for product naming"
    }
  ]
}`
  }

  /**
   * Builds the user prompt with source fields
   */
  private buildUserPrompt(sourceFields: string[]): string {
    if (!sourceFields || sourceFields.length === 0) {
      console.error('❌ buildUserPrompt: sourceFields is empty or null')
      throw new Error('Source fields array is empty or null')
    }
    
    return `Please map these source fields to target fields:

Source fields: ${sourceFields.join(', ')}

Return the mapping results in the specified JSON format.`
  }

  /**
   * Parses the AI response and validates it
   */
  private parseAIResponse(
    aiResult: any, 
    sourceFields: string[], 
    targetFields: TargetField[]
  ): FieldMappingResult[] {
    const results: FieldMappingResult[] = []
    
    if (!targetFields || targetFields.length === 0) {
      console.error('❌ parseAIResponse: targetFields is empty')
      return []
    }
    
    const targetFieldNames = targetFields.map(tf => tf?.field_name || 'Unknown')

    if (!aiResult.mappings || !Array.isArray(aiResult.mappings)) {
      console.warn('Invalid AI response format, using fallback')
      return this.fallbackMapping({ sourceFields, targetFields })
    }

    for (const mapping of aiResult.mappings) {
      // Validate the mapping
      if (
        sourceFields.includes(mapping.sourceField) &&
        targetFieldNames.includes(mapping.targetField) &&
        typeof mapping.confidence === 'number' &&
        mapping.confidence >= 0 && mapping.confidence <= 1
      ) {
        results.push({
          sourceField: mapping.sourceField,
          targetField: mapping.targetField,
          confidence: mapping.confidence,
          reason: mapping.reason || 'AI-suggested mapping'
        })
      }
    }

    // Add unmapped source fields with low confidence
    for (const sourceField of sourceFields) {
      if (!results.find(r => r.sourceField === sourceField)) {
        const fallbackTarget = this.findBestFallbackMatch(sourceField, targetFields)
        results.push({
          sourceField,
          targetField: fallbackTarget.field_name,
          confidence: 0.3,
          reason: 'Fallback mapping - manual review recommended'
        })
      }
    }

    return results
  }

  /**
   * Fallback mapping using simple string similarity
   */
  private fallbackMapping(request: FieldMappingRequest): FieldMappingResult[] {
    console.log('🔄 Using fallback mapping algorithm...')
    
    if (!request?.sourceFields || request.sourceFields.length === 0) {
      console.error('❌ fallbackMapping: sourceFields is empty')
      return []
    }
    
    if (!request?.targetFields || request.targetFields.length === 0) {
      console.error('❌ fallbackMapping: targetFields is empty')
      return []
    }
    
    const results: FieldMappingResult[] = []

    for (const sourceField of request.sourceFields) {
      if (!sourceField || typeof sourceField !== 'string') {
        console.warn('⚠️ Skipping invalid source field:', sourceField)
        continue
      }
      
      const bestMatch = this.findBestFallbackMatch(sourceField, request.targetFields)
      
      if (bestMatch) {
        const confidence = this.calculateSimilarity(sourceField, bestMatch.field_name)
        
        results.push({
          sourceField,
          targetField: bestMatch.field_name,
          confidence: Math.max(0.2, confidence), // Minimum confidence of 0.2
          reason: `String similarity match (fallback)`
        })
      }
    }

    console.log('✅ Fallback mapping completed:', results.length, 'mappings')
    return results
  }

  /**
   * Finds the best target field match using simple heuristics
   */
  private findBestFallbackMatch(sourceField: string, targetFields: TargetField[]): TargetField | null {
    if (!sourceField || !targetFields || targetFields.length === 0) {
      console.error('❌ findBestFallbackMatch: invalid parameters')
      return null
    }
    
    const sourceLower = sourceField.toLowerCase()
    
    // Define mapping rules for common patterns
    const mappingRules: { [key: string]: string[] } = {
      'Portal Name': ['name', 'title', 'product name', 'productname', 'portal name', 'item name'],
      'Producer Name': ['brand', 'manufacturer', 'producer', 'hersteller', 'make'],
      'Product Description': ['description', 'desc', 'details', 'beschreibung', 'initial data', 'important'],
      'Article Number/SKU': ['sku', 'article', 'item number', 'artikel', 'artikelnummer'],
      'GTIN': ['gtin', 'ean', 'barcode', 'upc'],
      'Initial Suggested Retail Price (SRP) EU': ['price', 'cost', 'preis', 'msrp', 'uvp', 'srp', 'usd'],
      'Custom Category': ['category', 'type', 'kategorie', 'produkttyp', 'product category'],
      'Color': ['color', 'colour', 'farbe'],
      'Country of Origin': ['country', 'origin', 'herkunft', 'land'],
      'Licence Name (Theme)': ['license', 'licence', 'theme', 'franchise'],
      'CN - Item': ['cn', 'item', 'classification'],
      'Release Name': ['release', 'edition', 'street date'],
      'Language Version': ['language', 'version', 'lang']
    }

    // First, try exact rule matching
    for (const [targetName, patterns] of Object.entries(mappingRules)) {
      const targetField = targetFields.find(tf => tf.field_name === targetName)
      if (targetField && patterns.some(pattern => sourceLower.includes(pattern))) {
        return targetField
      }
    }

    // If no rule match, find most similar by string similarity
    let bestMatch = targetFields[0]
    let bestSimilarity = 0

    for (const targetField of targetFields) {
      if (targetField?.field_name) {
        const similarity = this.calculateSimilarity(sourceLower, targetField.field_name.toLowerCase())
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity
          bestMatch = targetField
        }
      }
    }

    return bestMatch
  }

  /**
   * Calculates string similarity using a simple algorithm
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }
}

// Export singleton instance with error handling
let aiFieldMappingServiceInstance: AIFieldMappingService | null = null

export const aiFieldMappingService = (() => {
  if (!aiFieldMappingServiceInstance) {
    try {
      aiFieldMappingServiceInstance = new AIFieldMappingService()
      console.log('✅ AIFieldMappingService singleton created successfully')
    } catch (error) {
      console.error('❌ Error creating AIFieldMappingService:', error)
      throw error
    }
  }
  return aiFieldMappingServiceInstance
})()