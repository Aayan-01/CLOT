import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import ChatBox from './ChatBox';

interface ResultsPageProps {
  result: AnalysisResult;
  sessionId: string;
  onReset: () => void;
}

const ResultsPage: React.FC<ResultsPageProps> = ({
  result,
  sessionId,
  onReset,
}) => {
  const [showChat, setShowChat] = useState(false);

  // Remove markdown formatting from text and strip headings, code fences and list markers
  const stripMarkdown = (text: string = ''): string => {
    return text
      .replace(/```[\s\S]*?```/g, '') // remove fenced code blocks
      .replace(/`([^`]*)`/g, '$1') // inline code
      .replace(/^#{1,6}\s*/gm, '') // remove markdown header markers
      .replace(/^[-*+]\s*/gm, '') // remove leading list markers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1')     // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
      .trim();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500 text-gray-100';
      case 'uncommon': return 'bg-green-500 text-white';
      case 'rare': return 'bg-blue-500 text-white';
      case 'epic': return 'bg-purple-500 text-white';
      case 'legendary': return 'bg-orange-500 text-white';
      case 'mythic': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-gray-100';
    }
  };

  const getVerdictBadge = (verdict?: string) => {
    switch (verdict) {
      case 'AUTHENTIC': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'LIKELY AUTHENTIC': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'QUESTIONABLE': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'COUNTERFEIT': return 'bg-red-500/20 text-red-300 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  // Helper to extract platform names from sentences
  const extractPlatformNames = (platforms: string[]): string[] => {
    const knownPlatforms = [
      'Grailed', 'Depop', 'eBay', 'Poshmark', 'Vinted', 'Vestiaire Collective',
      'The RealReal', 'StockX', 'GOAT', 'Stadium Goods', 'Mercari', 'Etsy',
      'Facebook Marketplace', 'Instagram', 'Craigslist'
    ];
    
    const extracted: string[] = [];
    
    platforms.forEach(platform => {
      // Check if the platform string is already a short name
      if (platform.length < 30 && !platform.includes(' ')) {
        extracted.push(platform);
        return;
      }
      
      // Try to extract known platform names from sentences
      knownPlatforms.forEach(known => {
        if (platform.toLowerCase().includes(known.toLowerCase())) {
          if (!extracted.includes(known)) {
            extracted.push(known);
          }
        }
      });
      
      // If no known platform found and it's a sentence, just take first few words
      if (extracted.length === 0) {
        const words = platform.split(' ');
        if (words.length > 3) {
          extracted.push(words.slice(0, 3).join(' ') + '...');
        } else {
          extracted.push(platform);
        }
      }
    });
    
    return extracted.length > 0 ? extracted : platforms;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Analysis Results
          </h1>
          <button
            onClick={onReset}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            New Analysis
          </button>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {result.thumbnails.map((thumb, idx) => (
            <img
              key={idx}
              src={thumb}
              alt={`Item ${idx + 1}`}
              className="w-full h-64 object-cover rounded-xl border border-gray-700 shadow-lg"
            />
          ))}
        </div>

        {/* Pro tip (hint) for missing images */}
        {result.needs_more_images && (
          <div className="bg-gray-700/10 border border-gray-700/20 rounded-xl p-6 mb-8">
            <p className="text-sm text-gray-300 italic flex items-center gap-2">
              <span className="text-lg">💡</span>
              (pro tip :- Please upload photos of <strong>neck tags, care labels, and close-up stitching</strong> for more accurate authentication. )
            </p>
          </div>
        )}

        {/* Brand Identification & Authentication */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="text-3xl mr-3">🔍</span>
            Brand Identification & Authentication
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Authenticity Score */}
            <div>
              <div className="flex items-center mb-4">
                <div className={`text-5xl font-bold mr-4 ${getScoreColor(result.authenticity.score)}`}>
                  {result.authenticity.score}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                    <div
                      className={`h-4 rounded-full ${getScoreBg(result.authenticity.score)}`}
                      style={{ width: `${result.authenticity.score}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400">
                    Confidence: {result.authenticity.confidence}%
                  </p>
                </div>
              </div>
              
              {result.authenticity.verdict && (
                <div className={`inline-block px-4 py-2 rounded-lg border mb-4 ${getVerdictBadge(result.authenticity.verdict)}`}>
                  <span className="font-bold">{result.authenticity.verdict}</span>
                </div>
              )}
            </div>

            {/* Brand Info - FIXED: Show brand name instead of "Identification" */}
            <div>
              <p className="text-gray-400 text-sm mb-1">Detected Brand</p>
              <p className="text-2xl font-bold mb-2">{result.brand.name}</p>
              <p className="text-sm text-gray-400 mb-4">
                Confidence: {result.brand.confidence}%
              </p>
              
              {result.rarity && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Rarity Classification</p>
                  <span className={`inline-block px-4 py-2 rounded-lg font-bold uppercase text-sm ${getRarityColor(result.rarity)}`}>
                    {result.rarity}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Authentication Details */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Positive Indicators */}
            {result.authenticity.authenticityMarkers && result.authenticity.authenticityMarkers.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">✓ Authenticity Markers</h3>
                <ul className="space-y-1">
                  {result.authenticity.authenticityMarkers.map((marker, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start">
                      <span className="text-green-400 mr-2 mt-0.5">•</span>
                      <span>{stripMarkdown(marker)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Flags */}
            {result.authenticity.redFlags && result.authenticity.redFlags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">⚠ Red Flags</h3>
                <ul className="space-y-1">
                  {result.authenticity.redFlags.map((flag, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start">
                      <span className="text-red-400 mr-2 mt-0.5">•</span>
                      <span>{stripMarkdown(flag)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Key Observations */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Key Observations</h3>
            <div className="space-y-2">
              {result.authenticity.explanation.map((exp, idx) => (
                <div key={idx} className="flex items-start">
                  <span className="text-blue-400 mr-2 mt-0.5">•</span>
                  <p className="text-gray-300 text-sm">{stripMarkdown(exp)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing Estimation */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <span className="text-3xl mr-3">💰</span>
            Pricing Estimation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original Retail Price */}
            {result.priceEstimate.retail_price && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-purple-400">Original Retail Price</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">INR:</span>
                    <span className="text-2xl font-bold text-white">
                      ₹{result.priceEstimate.retail_price.inr.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">USD:</span>
                    <span className="text-2xl font-bold text-white">
                      ${result.priceEstimate.retail_price.usd.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Current Market Price */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-green-400">Current Market Value</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm mb-1">India (INR)</p>
                  <div className="flex justify-between text-base">
                    <span className="text-gray-300">₹{result.priceEstimate.current_market_price.inr.low.toLocaleString()}</span>
                    <span className="font-bold text-green-400 text-xl">
                      ₹{result.priceEstimate.current_market_price.inr.median.toLocaleString()}
                    </span>
                    <span className="text-gray-300">₹{result.priceEstimate.current_market_price.inr.high.toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-1">USA (USD)</p>
                  <div className="flex justify-between text-base">
                    <span className="text-gray-300">${result.priceEstimate.current_market_price.usd.low}</span>
                    <span className="font-bold text-green-400 text-xl">
                      ${result.priceEstimate.current_market_price.usd.median}
                    </span>
                    <span className="text-gray-300">${result.priceEstimate.current_market_price.usd.high}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Insights */}
          <div className="mt-6 space-y-3">
            {result.priceEstimate.reasoning && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Price Factors:</p>
                <p className="text-gray-300">{stripMarkdown(result.priceEstimate.reasoning)}</p>
              </div>
            )}
            {result.priceEstimate.marketInsights && (
              <div>
                <p className="text-sm text-gray-400 mb-1">Market Insights:</p>
                <p className="text-gray-300">{stripMarkdown(result.priceEstimate.marketInsights)}</p>
              </div>
            )}
            <p className="text-sm text-gray-400">
              Estimate confidence: {result.priceEstimate.confidence}%
            </p>
          </div>
        </div>

        {/* Era & Dating + Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Era & Dating - FIXED: Strip markdown */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="text-3xl mr-3">📅</span>
              Era & Dating
            </h2>
            <p className="text-xl font-semibold text-purple-400 mb-2">
              {stripMarkdown(result.era.classification)}
            </p>
            {result.era.decade && (
              <p className="text-lg text-blue-400 mb-3">Decade: {result.era.decade}</p>
            )}
            <p className="text-gray-300 text-sm leading-relaxed">{stripMarkdown(result.era.rationale)}</p>
          </div>

          {/* Condition */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="text-3xl mr-3">⭐</span>
              Condition
            </h2>
            <div className="flex items-center mb-3">
              <span className="text-3xl font-bold text-blue-400 mr-3">
                {result.condition.score}/5
              </span>
              <span className="text-xl text-gray-300">{stripMarkdown(result.condition.description)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {result.condition.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Features - FIXED: Strip markdown */}
        {result.detailedFeatures && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="text-3xl mr-3">🔬</span>
              Detailed Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.detailedFeatures.material && (
                <div>
                  <p className="text-gray-400 text-sm">Material</p>
                  <p className="text-gray-200 font-semibold">{stripMarkdown(result.detailedFeatures.material)}</p>
                </div>
              )}
              {result.detailedFeatures.color && (
                <div>
                  <p className="text-gray-400 text-sm">Color</p>
                  <p className="text-gray-200 font-semibold">{stripMarkdown(result.detailedFeatures.color)}</p>
                </div>
              )}
              {result.detailedFeatures.pattern && (
                <div>
                  <p className="text-gray-400 text-sm">Pattern</p>
                  <p className="text-gray-200 font-semibold">{stripMarkdown(result.detailedFeatures.pattern)}</p>
                </div>
              )}
              {result.detailedFeatures.size && (
                <div>
                  <p className="text-gray-400 text-sm">Size</p>
                  <p className="text-gray-200 font-semibold">{stripMarkdown(result.detailedFeatures.size)}</p>
                </div>
              )}
              {result.detailedFeatures.countryOfManufacture && (
                <div>
                  <p className="text-gray-400 text-sm">Made In</p>
                  <p className="text-gray-200 font-semibold">{stripMarkdown(result.detailedFeatures.countryOfManufacture)}</p>
                </div>
              )}
              {result.detailedFeatures.careInstructions && (
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-gray-400 text-sm">Care Instructions</p>
                  <p className="text-gray-200">{stripMarkdown(result.detailedFeatures.careInstructions)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Observations - FIXED: Remove subheadings for Styling and Comparable Items */}
        {result.additionalObservations && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="text-3xl mr-3">💡</span>
              Additional Observations
            </h2>
            
            <div className="space-y-6">
              {result.additionalObservations.investmentPotential && (
                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-2">Investment Potential</h3>
                  <p className="text-gray-300 leading-relaxed">{stripMarkdown(result.additionalObservations.investmentPotential)}</p>
                </div>
              )}

              {/* Styling suggestions and comparable items removed per product requirements */}

              {result.additionalObservations.resalePlatforms && result.additionalObservations.resalePlatforms.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">Best Resale Platforms</h3>
                  <div className="flex flex-wrap gap-2">
                    {extractPlatformNames(result.additionalObservations.resalePlatforms).map((platform, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-medium"
                      >
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.additionalObservations.culturalSignificance && (
                <div>
                  <h3 className="text-lg font-semibold text-orange-400 mb-2">Cultural Significance</h3>
                  <p className="text-gray-300 leading-relaxed">{stripMarkdown(result.additionalObservations.culturalSignificance)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REMOVED: Suggested Listing section completely removed */}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
            <h3 className="text-xl font-bold text-yellow-200 mb-3">
              ⚠️ Important Notes
            </h3>
            {result.warnings.map((warning, idx) => (
              <p key={idx} className="text-yellow-200 text-sm mb-2">
                • {warning}
              </p>
            ))}
          </div>
        )}

        {/* Chat Section */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-full flex justify-between items-center mb-4 hover:text-blue-400 transition-colors"
          >
            <h2 className="text-2xl font-bold">Continue Chat About This Item</h2>
            <span className="text-2xl">{showChat ? '▼' : '▶'}</span>
          </button>
          {showChat && <ChatBox sessionId={sessionId} />}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;