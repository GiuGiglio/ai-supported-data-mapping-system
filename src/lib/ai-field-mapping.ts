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
}

/**
 * AI-powered field mapping service that uses intelligent matching
 * to automatically map source fields to target fields
 */
export class AIFieldMappingService {
  private readonly apiKey: string | null

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || null
  }

  /**
   * Performs intelligent field mapping using AI
   */
  async mapFields(request: FieldMappingRequest): Promise<FieldMappingResult[]> {
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured. Using fallback mapping.')
      return this.fallbackMapping(request)
    }

    try {
      const systemPrompt = this.buildSystemPrompt(request.targetFields)
      const userPrompt = this.buildUserPrompt(request.sourceFields)

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      const aiResult = JSON.parse(data.choices[0].message.content)
      
      return this.parseAIResponse(aiResult, request.sourceFields, request.targetFields)
    } catch (error) {
      console.error('Error in AI field mapping:', error)
      return this.fallbackMapping(request)
    }
  }

  /**
   * Builds the system prompt for the AI
   */
  private buildSystemPrompt(targetFields: TargetField[]): string {
    const targetFieldNames = targetFields.map(tf => tf.field_name).join(', ')
    
    return `You are an expert data mapping AI specialized in mapping product data fields.

Your task is to map source fields from uploaded data files to the correct target fields in our system.

Target fields available in our system:
${targetFieldNames}

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
    const targetFieldNames = targetFields.map(tf => tf.field_name)

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
    const results: FieldMappingResult[] = []

    for (const sourceField of request.sourceFields) {
      const bestMatch = this.findBestFallbackMatch(sourceField, request.targetFields)
      const confidence = this.calculateSimilarity(sourceField, bestMatch.field_name)
      
      results.push({
        sourceField,
        targetField: bestMatch.field_name,
        confidence: Math.max(0.2, confidence), // Minimum confidence of 0.2
        reason: `String similarity match (fallback)`
      })
    }

    return results
  }

  /**
   * Finds the best target field match using simple heuristics
   */
  private findBestFallbackMatch(sourceField: string, targetFields: TargetField[]): TargetField {
    const sourceLower = sourceField.toLowerCase()
    
    // Define mapping rules for common patterns
    const mappingRules: { [key: string]: string[] } = {
      'Portal Name': ['name', 'title', 'product name', 'productname', 'portal name'],
      'Producer Name': ['brand', 'manufacturer', 'producer', 'hersteller', 'make'],
      'Product Description': ['description', 'desc', 'details', 'beschreibung'],
      'Article Number/SKU': ['sku', 'article', 'item number', 'artikel', 'artikelnummer'],
      'GTIN': ['gtin', 'ean', 'barcode', 'upc'],
      'Initial Suggested Retail Price (SRP) EU': ['price', 'cost', 'preis', 'msrp', 'uvp', 'srp'],
      'Custom Category': ['category', 'type', 'kategorie', 'produkttyp'],
      'Color': ['color', 'colour', 'farbe'],
      'Country of Origin': ['country', 'origin', 'herkunft', 'land']
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
      const similarity = this.calculateSimilarity(sourceLower, targetField.field_name.toLowerCase())
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity
        bestMatch = targetField
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

// Export singleton instance
export const aiFieldMappingService = new AIFieldMappingService()