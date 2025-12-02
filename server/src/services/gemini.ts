import "dotenv/config";
import axios from 'axios';
import fs from 'fs';

// Type definitions
export interface GeminiVisionResult {
  labels: string[];
  ocrText: string;
  logoDetection: string[];
  captions: string[];
  rawResponse?: any;
}

export interface AuthenticityResult {
  score: number;
  explanation: string[];
  confidence: number;
  detectedBrand?: string;
  redFlags?: string[];
  authenticityMarkers?: string[];
  verdict?: string;
}

export interface PriceEstimate {
  retail_price?: {
    inr: number;
    usd: number;
  };
  current_market_price: {
    inr: { low: number; median: number; high: number };
    usd: { low: number; median: number; high: number };
  };
  confidence: number;
  reasoning?: string;
  marketInsights?: string;
}

// ============ API Configuration ============

// Google Cloud API Key (for Pro Vision - Image Authentication)
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_GEMINI_API_KEY;

// Google AI Studio API Key (for Flash - Chat Continuation)
const GOOGLE_AI_STUDIO_API_KEY = process.env.GOOGLE_AI_STUDIO_FLASH_API_KEY;

// Helper checks: don't throw at module import time so service can start.
function ensureGeminiKey() {
  if (!GOOGLE_CLOUD_API_KEY) {
    throw new Error('Gemini Vision API key not configured — set GOOGLE_CLOUD_GEMINI_API_KEY in your environment (Cloud Run/ .env)');
  }
}

function ensureFlashKey() {
  if (!GOOGLE_AI_STUDIO_API_KEY) {
    throw new Error('Gemini Flash API key not configured — set GOOGLE_AI_STUDIO_FLASH_API_KEY in your environment (Cloud Run/ .env)');
  }
}

// API Endpoints
const GEMINI_PRO_VISION_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

const GEMINI_FLASH_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// ============ Master Prompt ============

const MASTER_AUTHENTICATION_PROMPT = `You are an expert fashion authentication specialist and vintage clothing appraiser with deep knowledge of luxury brands, streetwear, and historical fashion. Analyze the provided clothing item image(s) thoroughly and provide a detailed assessment.

## Analysis Requirements:

### 1. BRAND IDENTIFICATION & AUTHENTICATION (CRITICAL)
- Identify the brand with confidence level (0-100%)
- Examine logo placement, font, spacing, and proportions
- Check stitching quality, patterns, and thread color
- Verify hardware (zippers, buttons, rivets) against brand standards
- Look for authentication tags, care labels, and serial numbers
- Identify ANY red flags or counterfeit indicators
- Compare against known authentic examples
- **State clearly: AUTHENTIC, LIKELY AUTHENTIC, QUESTIONABLE, or COUNTERFEIT**

### 2. PRICING ESTIMATION
- Provide estimated retail value range (original and current market value)
- Consider condition, rarity, and demand
- Note if it's a collectible or limited edition piece
- Specify currency (USD)

### 3. ERA & DATING
- Determine production era/decade
- Identify seasonal collection if possible
- Note any vintage or retro characteristics
- Explain dating methodology (tags, style, materials)

### 4. DETAILED FEATURES
- Material composition and fabric quality
- Color and pattern description
- Condition assessment (new, excellent, good, fair, poor)
- Size information visible
- Notable design elements
- Care instructions
- Country of manufacture

### 5. RARITY (NEW)
Classify the item into: 
**Common, Uncommon, Rare, Epic, Legendary, Mythic**

### 6. ADDITIONAL OBSERVATIONS

**Cultural or Historical Significance:**
[Brief paragraph about cultural importance]

<!-- Styling suggestions and comparable items removed per UI requirements. -->

**Investment Potential:**
[Brief paragraph about investment value]

**Resale Platforms:**
List only platform names separated by commas (e.g., Grailed, Depop, eBay, Poshmark)
DO NOT write full sentences here - ONLY platform names.

IMPORTANT: Do not include Markdown headers (#, ##, ###), fenced code blocks (three backticks), bold/italics markers (**, *, _), or other Markdown characters — produce plain text only. This helps the app render results cleanly without raw Markdown markers.

### IMPORTANT:
If the image does NOT show neck tags, care labels, or authenticity labels, include this line:
"Upload a photo of neck tags, care labels, and close-up stitching for more accurate authentication."

## Output Format:
Provide your analysis in clear sections with the headers above. Be specific, detailed, and confident in your assessments. If you cannot determine something with certainty, explain why and what additional angles/photos would help.

CRITICAL: Brand authentication is the highest priority. Do not guess—if you're unsure, explain what specific details you need to see to make a determination.`;

export { MASTER_AUTHENTICATION_PROMPT };
// ============ Image Client (Pro Vision for Authentication) ============

/**
 * Analyze images using Gemini Pro Vision (Google Cloud API)
 * Used for: Initial image authentication and detailed analysis
 */
export async function analyzeImages(
  imagePaths: string[],
  customPrompt?: string
): Promise<GeminiVisionResult> {
  try {
    // Validate configuration
    ensureGeminiKey();
    const imageParts = imagePaths.map((imagePath) => {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      return {
        inline_data: {
          mime_type: mimeType,
          data: base64Image,
        },
      };
    });

    const prompt = customPrompt || MASTER_AUTHENTICATION_PROMPT;

    const response = await axios.post(
      `${GEMINI_PRO_VISION_ENDPOINT}?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: prompt },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 90000,
      }
    );

    const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const result: GeminiVisionResult = {
      labels: extractLabels(textResponse),
      ocrText: extractOCR(textResponse),
      logoDetection: extractLogos(textResponse),
      captions: [textResponse],
      rawResponse: textResponse,
    };

    return result;
  } catch (error: any) {
    console.error("Gemini Pro Vision API error:", error.response?.data || error.message);
    throw new Error(`Gemini Vision analysis failed: ${error.message}`);
  }
}

/**
 * Compute authenticity score using AI analysis with Pro Vision
 */
export async function computeAuthenticityWithAI(
  imagePaths: string[],
  visionAnalysis?: GeminiVisionResult
): Promise<AuthenticityResult> {
  try {
    // Verify key configuration
    ensureGeminiKey();
    let analysisText = '';
    if (visionAnalysis) {
      analysisText = visionAnalysis.rawResponse;
    } else {
      const analysis = await analyzeImages(imagePaths);
      analysisText = analysis.rawResponse;
    }

    const imageParts = imagePaths.map((imagePath) => {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      return {
        inline_data: {
          mime_type: mimeType,
          data: base64Image,
        },
      };
    });

    const authenticityPrompt = `You are an expert clothing authenticator with years of experience identifying genuine vs counterfeit items.

PREVIOUS ANALYSIS:
${analysisText}

Based on the images and analysis above, evaluate the authenticity of this clothing item.

Examine these authenticity factors:

**POSITIVE INDICATORS (increase authenticity):**
- Correct logo placement, stitching, and quality
- Authentic tags with proper formatting, serial numbers, care instructions
- High-quality materials and construction
- Correct fonts and spacing on labels
- Professional stitching and finishing
- Proper brand-specific details (buttons, zippers, etc.)
- Age-appropriate wear patterns for vintage items
- Holographic tags, NFC chips, or security features (if applicable)

**NEGATIVE INDICATORS (decrease authenticity):**
- Poor logo quality, incorrect placement, or misspellings
- Cheap materials or sloppy stitching
- Missing or incorrect tags
- Wrong fonts or inconsistent labeling
- Suspicious pricing claims in images
- Text like "replica", "inspired by", "AAA quality"
- Misaligned patterns or prints
- Incorrect brand details

**RED FLAGS (major concerns):**
- Obvious counterfeiting signs
- Tags with wrong country of origin
- Fake serial numbers or missing authentication codes
- Suspiciously perfect condition for claimed vintage items

Provide your response in this EXACT JSON format (no markdown, no extra text):
{
  "score": <number 0-100>,
  "verdict": "<AUTHENTIC|LIKELY AUTHENTIC|QUESTIONABLE|COUNTERFEIT>",
  "detectedBrand": "<brand name or 'Unknown'>",
  "confidence": <number 0-100>,
  "explanation": [
    "<reason 1>",
    "<reason 2>",
    "<reason 3>"
  ],
  "redFlags": [
    "<red flag 1>",
    "<red flag 2>"
  ],
  "authenticityMarkers": [
    "<positive marker 1>",
    "<positive marker 2>"
  ]
}

Score guide:
- 85-100: Highly likely authentic (AUTHENTIC)
- 70-84: Likely authentic with minor concerns (LIKELY AUTHENTIC)
- 50-69: Uncertain, needs more verification (QUESTIONABLE)
- 30-49: Likely counterfeit (QUESTIONABLE)
- 0-29: Almost certainly counterfeit (COUNTERFEIT)`;

    const response = await axios.post(
      `${GEMINI_PRO_VISION_ENDPOINT}?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: authenticityPrompt },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      }
    );

    let textResponse: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!textResponse || textResponse.trim().length === 0) {
      const strings: string[] = [];
      const collectStrings = (obj: any) => {
        if (!obj) return;
        if (typeof obj === 'string') return strings.push(obj);
        if (Array.isArray(obj)) return obj.forEach(collectStrings);
        if (typeof obj === 'object') return Object.values(obj).forEach(collectStrings);
      };
      collectStrings(response.data);

      if (strings.length > 0) {
        strings.sort((a, b) => b.length - a.length);
        textResponse = strings[0];
      }
    }

    let jsonText = '';
    const fencedJsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedJsonMatch) {
      jsonText = fencedJsonMatch[1];
    } else {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonText = jsonMatch[0];
    }

    if (!jsonText) {
      throw new Error("Could not parse JSON from AI authenticity response");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      const cleaned = jsonText
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"')
        .replace(/,\s*([}\]])/g, '$1');

      parsed = JSON.parse(cleaned);
    }

    return {
      score: Math.round(parsed.score),
      verdict: parsed.verdict || 'QUESTIONABLE',
      explanation: parsed.explanation || [],
      confidence: Math.round(parsed.confidence),
      detectedBrand: parsed.detectedBrand !== 'Unknown' ? parsed.detectedBrand : undefined,
      redFlags: parsed.redFlags || [],
      authenticityMarkers: parsed.authenticityMarkers || [],
    };
  } catch (error: any) {
    console.error("Gemini Authenticity Analysis error:", error.response?.data || error.message);
    throw new Error(`Authenticity analysis failed: ${error.message}`);
  }
}

/**
 * Estimate price using AI based on image analysis
 */
export async function estimatePriceWithAI(
  imagePaths: string[],
  visionAnalysis?: GeminiVisionResult,
  authenticityData?: AuthenticityResult,
  userLocation: string = "India"
): Promise<PriceEstimate> {
  try {
    // Verify configuration
    ensureGeminiKey();
    let analysisText = '';
    if (visionAnalysis) {
      analysisText = visionAnalysis.rawResponse;
    } else {
      const analysis = await analyzeImages(imagePaths);
      analysisText = analysis.rawResponse;
    }

    let authenticityContext = '';
    if (authenticityData) {
      authenticityContext = "\n\nAUTHENTICITY ASSESSMENT:\n- Authenticity Score: " +
        authenticityData.score +
        "/100\n- Verdict: " +
        (authenticityData.verdict || 'N/A') +
        "\n- Detected Brand: " +
        (authenticityData.detectedBrand || 'Unknown') +
        "\n- Confidence: " +
        authenticityData.confidence +
        "%\n- Key Points: " +
        (authenticityData.explanation?.join(', ') || 'N/A') +
        (authenticityData.redFlags && authenticityData.redFlags.length > 0 ? ("\n- Red Flags: " + authenticityData.redFlags.join(', ')) : "");
    }

    const imageParts = imagePaths.map((imagePath) => {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

      return {
        inline_data: {
          mime_type: mimeType,
          data: base64Image,
        },
      };
    });

    const pricePrompt = `You are an expert clothing appraiser with deep knowledge of fashion markets, brand values, and resale pricing.

PREVIOUS ANALYSIS:
${analysisText}
${authenticityContext}

Based on the images and analysis above, estimate BOTH the original retail price AND current market value for this item.

Consider these factors:
- **Brand reputation**: Premium brands vs. local brands
- **Actual condition**: Visible wear, fading, stains, holes, stitching quality
- **Authenticity**: Genuine items command premium prices
- **Era/vintage value**: Vintage items often have collector value
- **Material quality**: Natural fibers vs. synthetics
- **Current market demand**: What similar items sell for
- **Rarity**: Limited editions, discontinued items

Provide your response in this EXACT JSON format (no markdown, no extra text):
{
  "retail_price_inr": <original retail price in INR or 0 if unknown>,
  "retail_price_usd": <original retail price in USD or 0 if unknown>,
  "current_low_inr": <number>,
  "current_median_inr": <number>,
  "current_high_inr": <number>,
  "reasoning": "<2-3 sentence explanation of key price factors>",
  "confidence": <number between 0-100>,
  "marketInsights": "<brief note on market demand and selling tips>"
}

Rules:
- Prices should be realistic for resale market
- Low = worst-case/quick-sale price
- Median = fair market value
- High = best-case/premium buyer price
- If authenticity is questionable, significantly reduce prices`;

    const response = await axios.post(
      `${GEMINI_PRO_VISION_ENDPOINT}?key=${GOOGLE_CLOUD_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: pricePrompt },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      }
    );

    let textResponse: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!textResponse || textResponse.trim().length === 0) {
      const strings: string[] = [];
      const collectStrings = (obj: any) => {
        if (!obj) return;
        if (typeof obj === 'string') return strings.push(obj);
        if (Array.isArray(obj)) return obj.forEach(collectStrings);
        if (typeof obj === 'object') return Object.values(obj).forEach(collectStrings);
      };
      collectStrings(response.data);
      if (strings.length > 0) {
        strings.sort((a, b) => b.length - a.length);
        textResponse = strings[0];
      }
    }

    let jsonText = '';
    const fencedJsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedJsonMatch) {
      jsonText = fencedJsonMatch[1];
    } else {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonText = jsonMatch[0];
    }

    if (!jsonText) {
      throw new Error("Could not parse JSON from AI price response");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      const cleaned = jsonText
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"')
        .replace(/,\s*([}\]])/g, '$1');
      parsed = JSON.parse(cleaned);
    }

    const INR_TO_USD = 0.012;

    return {
      retail_price: parsed.retail_price_inr > 0 ? {
        inr: Math.round(parsed.retail_price_inr),
        usd: Math.round(parsed.retail_price_usd || parsed.retail_price_inr * INR_TO_USD),
      } : undefined,
      current_market_price: {
        inr: {
          low: Math.round(parsed.current_low_inr),
          median: Math.round(parsed.current_median_inr),
          high: Math.round(parsed.current_high_inr),
        },
        usd: {
          low: Math.round(parsed.current_low_inr * INR_TO_USD),
          median: Math.round(parsed.current_median_inr * INR_TO_USD),
          high: Math.round(parsed.current_high_inr * INR_TO_USD),
        },
      },
      reasoning: parsed.reasoning,
      confidence: parsed.confidence,
      marketInsights: parsed.marketInsights,
    };
  } catch (error: any) {
    console.error("Gemini Price Estimation error:", error.response?.data || error.message);
    throw new Error(`Price estimation failed: ${error.message}`);
  }
}

// ============ Chat Client (Flash for Conversation) ============

/**
 * Ask Gemini Flash for text responses (Google AI Studio API)
 * Used for: Follow-up chat messages
 */
export async function askGemini(prompt: string, context?: string): Promise<string> {
  // Ensure the Gemini Flash key exists at runtime
  ensureFlashKey();

  try {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

    const response = await axios.post(
      `${GEMINI_FLASH_ENDPOINT}?key=${GOOGLE_AI_STUDIO_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I apologize, I could not generate a response.';
  } catch (error: any) {
    console.error("Gemini Flash Chat API error:", error.response?.data || error.message);
    throw new Error(`Gemini chat failed: ${error.message}`);
  }
}

// ──────────── Helper Functions ────────────

function extractLabels(text: string): string[] {
  const labels: string[] = [];
  const labelPatterns = [
    /\b(cotton|polyester|wool|silk|denim|leather|linen|nylon)\b/gi,
    /\b(t-shirt|shirt|jacket|jeans|pants|hoodie|sweater|dress|skirt)\b/gi,
    /\b(vintage|retro|modern|contemporary|classic)\b/gi,
  ];

  labelPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      labels.push(...matches.map(m => m.toLowerCase()));
    }
  });

  return [...new Set(labels)];
}

function extractOCR(text: string): string {
  const ocrPatterns = [
    /tag[s]?\s*(?:shows?|reads?|says?|contains?)[\s:]+["']([^"']+)["']/gi,
    /label[s]?\s*(?:shows?|reads?|says?|contains?)[\s:]+["']([^"']+)["']/gi,
    /text[s]?\s*(?:visible|found|detected)[\s:]+["']([^"']+)["']/gi,
  ];

  const ocrTexts: string[] = [];
  ocrPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      ocrTexts.push(match[1]);
    }
  });

  return ocrTexts.join('; ');
}

function extractLogos(text: string): string[] {
  const logos: string[] = [];
  const logoPatterns = [
    /\b(nike|adidas|supreme|gucci|levi'?s|zara|north face|puma|reebok|jordan)\b/gi,
    /logo[s]?\s*(?:shows?|displays?|features?)[\s:]+(\w+)/gi,
  ];

  logoPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      logos.push(...matches.map(m => m.trim().toLowerCase()));
    }
  });

  return [...new Set(logos)];
}