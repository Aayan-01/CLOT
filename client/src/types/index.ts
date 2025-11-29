export interface AnalysisResult {
  authenticity: {
    score: number;
    explanation: string[];
    confidence: number;
    authenticityMarkers?: string[];
    redFlags?: string[];
    verdict?: string;
  };
  brand: {
    name: string;
    confidence: number;
    alternatives?: string[];
  };
  condition: {
    score: number;
    description: string;
    tags: string[];
  };
  era: {
    classification: string;
    rationale: string;
    decade?: string;
  };
  priceEstimate: {
    retail_price?: {
      inr: number;
      usd: number;
    };
    current_market_price: {
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
  };
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  detailedFeatures?: {
    material?: string;
    color?: string;
    pattern?: string;
    size?: string;
    careInstructions?: string;
    countryOfManufacture?: string;
    notableDesignElements?: string[];
  };
  additionalObservations?: {
    culturalSignificance?: string;
    investmentPotential?: string;
    resalePlatforms?: string[];
  };
  // listing removed — suggested listing info no longer returned
  thumbnails: string[];
  warnings: string[];
  needs_more_images?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}