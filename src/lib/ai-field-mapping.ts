import { TargetField } from './supabase'

export interface FieldMappingResult {
  sourceField: string
  targetField: string
  confidence: number
  reason: string
  isRequired?: boolean  // AI decides if this is required or optional
  isOptional?: boolean  // AI decides if this should be kept as optional
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
      console.warn('⚠️ mapFields: targetFields is empty - AI will decide Required vs Optional automatically')
      request.targetFields = [] // Ensure it's an empty array, not null
    }

    if (!this.apiKey || this.apiKey === 'your-api-key-here' || this.apiKey.trim() === '') {
      console.error('❌ Gemini API key not configured. Cannot proceed with AI mapping.')
      console.log('API Key status:', this.apiKey)
      throw new Error('Gemini API key is required for field mapping')
    }

    try {
      console.log('🚀 Attempting AI mapping with Gemini...')
      return await this.performAIMapping(request)
    } catch (error: any) {
      console.error('❌ AI mapping failed:', error.message)
      console.log('🔄 Falling back to string similarity mapping...')
      return this.fallbackMapping(request)
    }
  }

  /**
   * Performs the actual AI mapping using Gemini
   */
  private async performAIMapping(request: FieldMappingRequest): Promise<FieldMappingResult[]> {
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
    let jsonText = responseText.trim()
    
    try {
      // Sometimes Gemini returns text with code blocks, extract JSON
      console.log('🔍 Processing Gemini response text (length: ' + jsonText.length + '):', jsonText.substring(0, 200) + '...')
      
      // Remove markdown code blocks if present
      if (jsonText.includes('```json')) {
        console.log('📦 Extracting JSON from ```json``` code block')
        let jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/i)
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1].trim()
          console.log('✂️ Extracted JSON from complete code block (length: ' + jsonText.length + ')')
        } else {
          console.log('🔧 Incomplete code block detected - extracting from ```json to end')
          const startMatch = jsonText.match(/```json\s*([\s\S]*)/i)
          if (startMatch && startMatch[1]) {
            jsonText = startMatch[1].trim()
            console.log('✂️ Extracted JSON from incomplete code block (length: ' + jsonText.length + ')')
          }
        }
      } else if (jsonText.includes('```')) {
        console.log('📦 Extracting JSON from ``` code block')
        let jsonMatch = jsonText.match(/```\s*([\s\S]*?)\s*```/)
        if (jsonMatch && jsonMatch[1]) {
          jsonText = jsonMatch[1].trim()
          console.log('✂️ Extracted JSON from complete code block (length: ' + jsonText.length + ')')
        } else {
          console.log('🔧 Incomplete code block detected - extracting from ``` to end')
          const startMatch = jsonText.match(/```\s*([\s\S]*)/i)
          if (startMatch && startMatch[1]) {
            jsonText = startMatch[1].trim()
            console.log('✂️ Extracted JSON from incomplete code block (length: ' + jsonText.length + ')')
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
            const lastMatch = completeMatches[completeMatches.length - 1] as RegExpMatchArray
            const lastCompleteIndex = lastMatch.index! + lastMatch[0].length
            
            // Extract up to the last complete mapping
            const upToLastComplete = jsonText.substring(0, lastCompleteIndex)
            repairedJsonText = upToLastComplete + '\n  ]\n}'
            
            console.log(`🔧 Found ${completeMatches.length} complete mappings, keeping all available mappings`)
            console.log('💡 Note: This preserves all mappings that Gemini provided, no artificial truncation')
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
      const mappingsMatch = responseText.match(/"mappings"\s*:\s*\[(.*?)\]/)
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
  }

  /**
   * Builds the system prompt for the AI
   */
  private buildSystemPrompt(targetFields: TargetField[], fieldDescriptions?: Record<string, string>): string {
    let targetFieldNames = ''
    let hasTargetFields = targetFields && targetFields.length > 0
    
    if (hasTargetFields) {
      targetFieldNames = targetFields.map(tf => tf?.field_name || 'Unknown').join(', ')
    } else {
      console.log('🤖 No target fields provided - AI will decide Required vs Optional automatically')
      targetFieldNames = 'No predefined target fields - AI will categorize fields as Required or Optional based on common e-commerce standards'
    }
    
    // Build enhanced field descriptions if available
    let fieldDescriptionsText = ''
    if (fieldDescriptions && Object.keys(fieldDescriptions).length > 0) {
      fieldDescriptionsText = '\n\nField Descriptions (IMPORTANT for accurate mapping):\n'
      Object.entries(fieldDescriptions).forEach(([fieldName, description]) => {
        fieldDescriptionsText += `- "${fieldName}": ${description}\n`
      })
      fieldDescriptionsText += '\nUse these descriptions to understand field meanings and map accordingly.\n'
    }
    
    const mappingInstructions = hasTargetFields ? 
      `Your task is to map source fields from uploaded data files to the correct target fields in our system.

Target fields available in our system:
${targetFieldNames}${fieldDescriptionsText}

Rules for mapping:
1. **CRITICAL**: Map EVERY SINGLE source field provided - do not skip any fields
2. **EXACT MATCHES = REQUIRED**: If source field name matches a target field name EXACTLY, always set isRequired: true
3. **SEMANTIC MATCHES = REQUIRED**: If source field has clear semantic match to target field, set isRequired: true
4. **NO MATCH = OPTIONAL**: Only when no good target match exists, keep as optional with original source field name
5. Consider semantic similarity (e.g., "Product Name" → "Portal Name")
6. Consider common variations and synonyms
7. Consider different languages (German/English)
8. Provide confidence score (0-1) for each mapping
9. Provide a brief reason for each mapping
10. **IMPORTANT**: The response must include exactly as many mappings as source fields provided
11. **CRITICAL RULE**: "Initial Suggested Retail Price (SRP) JP" should ALWAYS map to "Initial Suggested Retail Price (SRP) JP" with isRequired: true` :
      `Your task is to intelligently categorize and map source fields from uploaded data files.

${targetFieldNames}${fieldDescriptionsText}

Rules for intelligent mapping:
1. **CRITICAL**: Map EVERY SINGLE source field provided - do not skip any fields
2. **SMART CATEGORIZATION**: For each field, decide if it's a standard e-commerce field or optional
3. **Standard Fields**: Map common fields to their standard names (e.g., "Product Name" → "Portal Name")
4. **Optional Fields**: Keep unique/specialized fields with their original names
5. Consider semantic similarity and common e-commerce patterns
6. Consider different languages (German/English)
7. Provide confidence score (0-1) for each mapping
8. Provide a brief reason for each mapping
9. **IMPORTANT**: The response must include exactly as many mappings as source fields provided
10. **COMMON STANDARD FIELDS**: Article Number/SKU, GTIN, Product Description, Producer Name, etc.`

    return `You are an expert data mapping AI specialized in mapping product data fields.

${mappingInstructions}

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
      "targetField": "target field name OR keep original name for optional", 
      "confidence": 0.95,
      "reason": "Exact semantic match for product naming",
      "isRequired": true,
      "isOptional": false
    }
  ]
}

**IMPORTANT FIELD CATEGORIZATION:**
- Set "isRequired": true, "isOptional": false for fields that match target fields
- Set "isRequired": false, "isOptional": true for fields that should remain optional
- For optional fields, keep original sourceField name as targetField`
  }

  /**
   * Builds the user prompt with source fields
   */
  private buildUserPrompt(sourceFields: string[]): string {
    if (!sourceFields || sourceFields.length === 0) {
      console.error('❌ buildUserPrompt: sourceFields is empty or null')
      throw new Error('Source fields array is empty or null')
    }
    
    return `Please map ALL of these ${sourceFields.length} source fields to target fields:

Source fields to map (${sourceFields.length} total):
${sourceFields.map((field, index) => `${index + 1}. "${field}"`).join('\n')}

**CRITICAL REQUIREMENTS:**
- Map ALL ${sourceFields.length} source fields listed above
- Your response must contain exactly ${sourceFields.length} mappings
- Do not skip any source fields, even if they seem unrelated
- For unclear fields, use your best judgment with lower confidence scores

Return the mapping results in the specified JSON format with exactly ${sourceFields.length} mappings.`
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
    
    const targetFieldNames = targetFields?.map(tf => tf?.field_name || 'Unknown') || []
    const hasTargetFields = targetFields && targetFields.length > 0

    if (!aiResult.mappings || !Array.isArray(aiResult.mappings)) {
      console.error('❌ Invalid AI response format - no mappings array found')
      console.log('AI Response:', aiResult)
      throw new Error('Invalid AI response: missing or invalid mappings array')
    }

    console.log(`🔍 Processing ${aiResult.mappings.length} AI mappings for ${sourceFields.length} source fields...`)
    console.log(`📊 Expected: ${sourceFields.length} mappings, Received: ${aiResult.mappings.length} mappings`)

    for (const mapping of aiResult.mappings) {
      // Basic validation
      if (
        !mapping.sourceField ||
        !sourceFields.includes(mapping.sourceField) ||
        typeof mapping.confidence !== 'number' ||
        mapping.confidence < 0 || mapping.confidence > 1
      ) {
        console.warn(`⚠️ Skipping invalid mapping:`, mapping)
        console.warn(`   - sourceField exists: ${!!mapping.sourceField}`)
        console.warn(`   - sourceField in list: ${sourceFields.includes(mapping.sourceField)}`)
        console.warn(`   - confidence valid: ${typeof mapping.confidence === 'number' && mapping.confidence >= 0 && mapping.confidence <= 1}`)
        continue
      }

      // Determine if this is a required or optional mapping
      // Priority: AI explicit decision > target field match > default optional
      let isRequired = false
      let isOptional = false
      
      if (mapping.isRequired === true) {
        isRequired = true
        isOptional = false
      } else if (mapping.isOptional === true) {
        isRequired = false
        isOptional = true
      } else if (hasTargetFields && targetFieldNames.includes(mapping.targetField)) {
        // Target field match = required
        isRequired = true
        isOptional = false
      } else {
        // No match or no target fields = optional
        isRequired = false
        isOptional = true
      }

      results.push({
        sourceField: mapping.sourceField,
        targetField: mapping.targetField || mapping.sourceField, // Keep original name if no target
        confidence: mapping.confidence,
        reason: mapping.reason || 'AI-suggested mapping',
        isRequired: isRequired,
        isOptional: isOptional
      })
    }

    // Ensure ALL source fields are mapped (NO FALLBACK - only AI decisions)
    for (const sourceField of sourceFields) {
      if (!results.find(r => r.sourceField === sourceField)) {
        console.log(`📝 Adding unmapped source field as optional: ${sourceField}`)
        
        // NO FALLBACK MATCHING - keep as optional with original name
        results.push({
          sourceField,
          targetField: sourceField,
          confidence: 0.5,
          reason: 'AI did not map this field - kept as optional',
          isRequired: false,
          isOptional: true
        })
      }
    }

    // CRITICAL: Ensure ALL 42 required target fields are present in results
    if (hasTargetFields) {
      for (const targetField of targetFields) {
        const fieldName = targetField.field_name
        if (!results.find(r => r.targetField === fieldName)) {
          console.log(`⚠️ Adding missing required field: ${fieldName}`)
          results.push({
            sourceField: `[MISSING] ${fieldName}`,
            targetField: fieldName,
            confidence: 0.0,
            reason: 'Required field not found in source data - needs manual input',
            isRequired: true,
            isOptional: false
          })
        }
      }
    }

    // CRITICAL: Post-process to fix classification - exact matches should be Required
    console.log('🔧 Post-processing classification...')
    for (const result of results) {
      if (hasTargetFields && targetFieldNames.includes(result.targetField)) {
        // If target field exists in our system, it should be Required
        if (!result.isRequired) {
          console.log(`🔧 Fixing classification: "${result.sourceField}" → "${result.targetField}" should be Required`)
          result.isRequired = true
          result.isOptional = false
          result.reason = `${result.reason} (auto-corrected: exact target field match)`
        }
      }
    }

    console.log(`✅ Final results: ${results.length} total mappings for ${sourceFields.length} source fields`)
    console.log(`   - ${results.filter(r => r.isRequired).length} required mappings`)
    console.log(`   - ${results.filter(r => r.isOptional).length} optional mappings`) 
    console.log(`   - ${results.filter(r => r.sourceField.startsWith('[MISSING]')).length} missing target fields`)
    
    // Verify we have ALL source fields
    const mappedSourceFields = results.map(r => r.sourceField).filter(sf => !sf.startsWith('[MISSING]'))
    const missingSourceFields = sourceFields.filter(sf => !mappedSourceFields.includes(sf))
    if (missingSourceFields.length > 0) {
      console.warn(`⚠️ Missing source field mappings: ${missingSourceFields.join(', ')}`)
    }
    
    return results
  }

  /**
   * Fallback mapping using simple string similarity
   */
  private fallbackMapping(request: FieldMappingRequest): FieldMappingResult[] {
    console.log('🔄 Using fallback mapping algorithm (AI API unavailable)...')
    
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
          reason: `String similarity match (fallback - AI unavailable)`,
          isRequired: true,
          isOptional: false
        })
      } else {
        // No match found, keep as optional
        results.push({
          sourceField,
          targetField: sourceField,
          confidence: 0.5,
          reason: 'No target field match found - kept as optional (fallback)',
          isRequired: false,
          isOptional: true
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