import { TargetField } from './supabase'

export interface ProductNameRequest {
  productData: Record<string, any>
  category?: string
  brand?: string
  description?: string
}

export interface ProductNameResult {
  generatedName: string
  confidence: number
  reasoning: string
  format: string
}

class AIProductNameService {
  private apiKey: string

  constructor() {
    // Use Gemini API key from environment or fallback
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyAckWtkcTgkx5_WoyRV48BZfsiL0ISAMDc'
    
    console.log('🏗️ AIProductNameService constructor called')
    console.log('🔑 Gemini API key exists:', !!this.apiKey)
  }

  async generateProductName(request: ProductNameRequest): Promise<ProductNameResult> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      throw new Error('Gemini API key is required for product name generation')
    }

    try {
      console.log('🚀 Generating product name with Gemini...')
      console.log('📊 Product data:', request)

      const systemPrompt = this.buildSystemPrompt()
      const userPrompt = this.buildUserPrompt(request)

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt },
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API request failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('📥 Gemini API response received:', data)

      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      console.log('📄 Raw response text:', responseText)

      // Parse the JSON response
      let aiResult: any
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonText = responseText
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (codeBlockMatch) {
          jsonText = codeBlockMatch[1]
        }

        aiResult = JSON.parse(jsonText)
        console.log('✅ Successfully parsed AI result:', aiResult)
      } catch (parseError) {
        console.error('❌ Failed to parse Gemini JSON response:', parseError)
        console.log('📄 Full raw response text:', responseText)
        throw new Error('Invalid JSON response from Gemini API')
      }

      // Validate and return result
      if (!aiResult.generatedName) {
        throw new Error('Invalid response: missing generatedName')
      }

      const result: ProductNameResult = {
        generatedName: aiResult.generatedName,
        confidence: aiResult.confidence || 0.8,
        reasoning: aiResult.reasoning || 'AI-generated product name',
        format: aiResult.format || 'Brand + Description + Attributes'
      }

      console.log('✅ Product name generated successfully:', result)
      return result

    } catch (error: any) {
      console.error('❌ Error in AI product name generation:', error)
      throw new Error(`AI product name generation failed: ${error.message}`)
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert product naming AI specialized in creating consistent, professional product names for e-commerce.

Your task is to generate product names that follow this format:
"Brand + Product Description + Important Attributes"

Rules for product naming:
1. Always start with the brand/manufacturer name if available
2. Include the core product description (what it is)
3. Add the most important distinguishing attributes (size, color, material, etc.)
4. Keep names concise but descriptive (max 80 characters)
5. Use proper capitalization and formatting
6. Avoid unnecessary words like "the", "a", "an" unless they're part of official names
7. For collectibles, include franchise/character information
8. For technical products, include key specifications

Examples of good product names:
- "Funko Pop! Marvel Spider-Man Vinyl Figure 10cm"
- "LEGO Creator Expert Volkswagen Beetle 10252"
- "Samsung Galaxy S23 Ultra 256GB Phantom Black"
- "The Lord of the Rings Galadriel Miniature Statue"

Response format must be valid JSON:
{
  "generatedName": "Generated product name following the format",
  "confidence": 0.95,
  "reasoning": "Explanation of naming decisions",
  "format": "Brand + Description + Key Attributes"
}`
  }

  private buildUserPrompt(request: ProductNameRequest): string {
    const { productData, category, brand, description } = request

    let prompt = `Please generate a professional product name based on the following product information:

Product Data:
${JSON.stringify(productData, null, 2)}
`

    if (category) {
      prompt += `\nCategory: ${category}`
    }

    if (brand) {
      prompt += `\nBrand: ${brand}`
    }

    if (description) {
      prompt += `\nDescription: ${description}`
    }

    prompt += `

Key requirements:
1. Create a name that follows the "Brand + Description + Attributes" format
2. Use information from the product data to identify key attributes
3. Ensure the name is professional and suitable for e-commerce
4. Prioritize the most important distinguishing features
5. Keep it concise but informative

Generate a product name that would help customers quickly understand what this product is and its key features.`

    return prompt
  }
}

// Export singleton instance
export const aiProductNameService = new AIProductNameService()