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
  verdict?: string; // NEW: AUTHENTIC, LIKELY AUTHENTIC, QUESTIONABLE, COUNTERFEIT
}

export interface BrandResult {
  name: string;
  confidence: number;
  alternatives?: string[];
}

export interface ConditionResult {
  score: number;
  description: string;
  tags: string[];
}

export interface EraResult {
  classification: string;
  rationale: string;
  decade?: string; // NEW: Production decade/era
}

export interface PriceEstimate {
  retail_price?: { // NEW: Original retail price
    inr: number;
    usd: number;
  };
  current_market_price: { // NEW: Current market value
    inr: {
      low: number;
      median: number;
      high: number;
    };
    usd: {
      low: number;
      median: number;
      high: number;
    };
  };
  confidence: number;
  reasoning?: string;
  marketInsights?: string;
}


export interface DetailedFeatures {
  material?: string;
  color?: string;
  pattern?: string;
  size?: string;
  careInstructions?: string;
  countryOfManufacture?: string;
  notableDesignElements?: string[];
}

export interface AdditionalObservations {
  culturalSignificance?: string;
  investmentPotential?: string;
  resalePlatforms?: string[];
}

export interface AnalysisResult {
  authenticity: AuthenticityResult;
  brand: BrandResult;
  condition: ConditionResult;
  era: EraResult;
  priceEstimate: PriceEstimate;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'; // NEW
  detailedFeatures?: DetailedFeatures; // NEW
  additionalObservations?: AdditionalObservations; // NEW
  // listing removed — suggested listing information is no longer provided
  thumbnails: string[];
  warnings: string[];
  needs_more_images?: boolean; // NEW: Flag for missing tag photos
}

export interface SessionData {
  imagePaths: string[];
  analysis: AnalysisResult;
  conversationHistory: Array<{ role: string; content: string }>;
}

export interface BrandData {
  name: string;
  keywords: string[];
  logoPatterns: string[];
  priceMultiplier: number;
}