import React, { useState } from "react";
import { AnalysisResult } from "../types";
import Chatbot from "./Chatbot";

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

  const stripMarkdown = (text: string = "") =>
    text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^[-*+]\s*/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .trim();

  const badge = (text: string, className = "") => (
    <span
      className={`px-3 py-1.5 rounded-full text-sm font-medium border ${className}`}
    >
      {text}
    </span>
  );

  const getRarityColor = (rarity?: string) => {
    switch (rarity) {
      case "common":
        return "bg-gray-500 text-gray-100";
      case "uncommon":
        return "bg-green-500 text-white";
      case "rare":
        return "bg-blue-500 text-white";
      case "epic":
        return "bg-purple-500 text-white";
      case "legendary":
        return "bg-orange-500 text-white";
      case "mythic":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-gray-100";
    }
  };

  const getVerdictStyles = (verdict?: string) => {
    // Normalize common verdict strings coming from server
    const v = (verdict || "").toUpperCase().trim();

    switch (v) {
      case "AUTHENTIC":
        return {
          bar: "bg-emerald-600",
          scoreText: "text-emerald-700",
          badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
        };
      case "LIKELY AUTHENTIC":
        return {
          bar: "bg-green-500",
          scoreText: "text-green-700",
          badge: "bg-green-100 text-green-800 border-green-200",
        };
      case "QUESTIONABLE":
        return {
          bar: "bg-amber-400",
          scoreText: "text-amber-700",
          badge: "bg-amber-100 text-amber-900 border-amber-200",
        };
      case "COUNTERFEIT":
        return {
          bar: "bg-red-600",
          scoreText: "text-red-700",
          badge: "bg-red-100 text-red-800 border-red-200",
        };
      default:
        return {
          bar: "bg-black",
          scoreText: "text-gray-900",
          badge: "bg-gray-100 text-gray-800 border-gray-200",
        };
    }
  };

  const resolveThumbnailSrc = (src: string) => {
    if (!src) return src;

    // Normalize backslashes (Windows paths) to forward slashes so checks are reliable
    const normalized = src.replace(/\\/g, '/');

    // If the server sent a relative uploads path (with or without leading slash),
    // prepend the API origin so the browser can fetch it correctly.
    if (normalized.startsWith('/uploads') || normalized.startsWith('uploads')) {
      const apiOrigin = (import.meta as any).env?.VITE_API_ORIGIN ?? ((import.meta as any).env?.DEV ? 'http://localhost:4000' : window.location.origin);
      return `${apiOrigin}${normalized.startsWith('/') ? normalized : '/' + normalized}`;
    }

    // Already an absolute URL – return as-is
    return src;
  };

  const authenticityStyles = getVerdictStyles(result.authenticity?.verdict);

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] relative">
      {/* GRID BG */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
          `,
          backgroundSize: "20px 30px",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 100%, #000 60%, transparent 100%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto p-6 md:p-10">
        {/* HEADER */}
        <div className="text-center mb-12">
          <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Retro Rate</div>
          <p className="text-gray-600 mt-2 text-lg">AI-powered authenticity verification & price estimation</p>

          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mt-6">Analysis Results</h1>
          <p className="text-gray-600 mt-2">Here’s your detailed authenticity & pricing report.</p>

          <button
            onClick={onReset}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-900 transition"
          >
            New Analysis
          </button>
        </div>

        {/* CARD */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-200 space-y-10">
          {/* IMAGES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.thumbnails.map((src, i) => (
              <img
                key={i}
                src={resolveThumbnailSrc(src)}
                alt={`thumbnail ${i + 1}`}
                loading="lazy"
                className="rounded-xl border object-cover w-full h-48"
              />
            ))}
          </div>

          {/* HINT */}
          {result.needs_more_images && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              <strong>Pro tip:</strong> Upload clear shots of tags, stitching &
              details for even more accurate authentication.
            </div>
          )}

          {/* BRAND (moved above authenticity) */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Brand Identification
            </h2>

            <p className="text-xl font-bold text-gray-900">{result.brand.name}</p>
            <p className="text-gray-600 text-sm mb-2">Confidence: {result.brand.confidence}%</p>

            {result.rarity && (
              <div className="mt-2">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRarityColor(result.rarity)}`}>
                  {result.rarity}
                </span>
              </div>
            )}
          </section>

          {/* AUTHENTICITY */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Authenticity Report
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <div className={`text-5xl font-bold ${authenticityStyles.scoreText}`}>
                  {result.authenticity.score}
                </div>

                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded-full" role="progressbar" aria-label="Authenticity score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result.authenticity.score}>
                    <div
                      className={`h-3 rounded-full transition-all ${authenticityStyles.bar}`}
                      style={{ width: `${Math.max(0, Math.min(100, result.authenticity.score))}%` }}
                    ></div>
                  </div>

                  <p className="text-gray-500 text-sm mt-1">
                    Confidence {result.authenticity.confidence}%
                  </p>
                </div>
              </div>

              {/* Verdict badge */}
              {result.authenticity.verdict && (
                <span className={`inline-block mt-3 px-4 py-2 rounded-full border font-medium ${authenticityStyles.badge}`}>
                  {result.authenticity.verdict}
                </span>
              )}
            </div>

            {/* Markers & Flags */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {(result.authenticity.authenticityMarkers?.length ?? 0) > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Positive Indicators
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {result.authenticity.authenticityMarkers?.map((m) => (
                      <li key={m}>• {stripMarkdown(m)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(result.authenticity.redFlags?.length ?? 0) > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Red Flags
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {result.authenticity.redFlags?.map((f) => (
                      <li key={f}>• {stripMarkdown(f)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Explanation */}
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold text-gray-800">Key Observations</h3>
              {result.authenticity.explanation.map((exp, i) => (
                <p key={i} className="text-gray-600 text-sm">
                  • {stripMarkdown(exp)}
                </p>
              ))}
            </div>
          </section>

          

          {/* PRICING */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Pricing Estimate
            </h2>

            {/* Retail */}
            {result.priceEstimate.retail_price && (
              <div className="p-4 border rounded-xl bg-gray-50">
                <h3 className="font-medium text-gray-800 mb-2">
                  Original Retail
                </h3>

                <p className="text-gray-900 font-semibold text-lg">
                  ₹{result.priceEstimate.retail_price.inr.toLocaleString()}
                </p>
              </div>
            )}

            {/* Current market */}
            <div className="mt-4 p-4 border rounded-xl bg-gray-50">
              <h3 className="font-medium text-gray-800 mb-2">
                Current Market Value
              </h3>

              <p className="flex justify-between text-gray-700 text-sm">
                <span>Low:</span>
                <span>
                  ₹{result.priceEstimate.current_market_price.inr.low}
                </span>
              </p>
              <p className="flex justify-between text-lg font-bold text-black">
                <span>Median:</span>
                <span>
                  ₹{result.priceEstimate.current_market_price.inr.median}
                </span>
              </p>
              <p className="flex justify-between text-gray-700 text-sm">
                <span>High:</span>
                <span>
                  ₹{result.priceEstimate.current_market_price.inr.high}
                </span>
              </p>
            </div>
          </section>

          {/* ERA */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Era & Dating
            </h2>

            <p className="text-xl text-gray-900 font-semibold">
              {stripMarkdown(result.era.classification)}
            </p>

            {result.era.decade && (
              <p className="text-gray-600">Decade: {result.era.decade}</p>
            )}

            <p className="text-gray-600 text-sm mt-2">
              {stripMarkdown(result.era.rationale)}
            </p>
          </section>

          {/* CONDITION */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-900">
              Condition
            </h2>

            <p className="text-xl font-bold text-gray-900">
              {result.condition.score}/5
            </p>

            <p className="text-gray-600 text-sm mb-2">
              {stripMarkdown(result.condition.description)}
            </p>

            <div className="flex flex-wrap gap-2">
              {result.condition.tags.map((t) =>
                badge(t, "bg-gray-100 border-gray-300 text-gray-700")
              )}
            </div>
          </section>

          {/* FEATURES */}
          {result.detailedFeatures && (
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">
                Detailed Features
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(result.detailedFeatures).map(([k, v], i) =>
                  v ? (
                    <div key={i}>
                      <p className="text-gray-500 text-sm">{k}</p>
                      <p className="font-medium text-gray-900">
                        {stripMarkdown(v as string)}
                      </p>
                    </div>
                  ) : null
                )}
              </div>
            </section>
          )}

          {/* WARNINGS */}
          {result.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Important Notes
              </h3>

              {result.warnings.map((w, i) => (
                <p key={i} className="text-yellow-800">
                  • {w}
                </p>
              ))}
            </div>
          )}

          {/* CHAT */}
          <section className="pt-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="w-full flex justify-between items-center py-3 px-4 border rounded-xl hover:bg-gray-50 transition"
            >
              <h2 className="font-semibold text-gray-900">
                Continue Chat About This Item
              </h2>
              <span className="text-xl">{showChat ? "▼" : "▶"}</span>
            </button>

            {showChat && (
              <div className="mt-4 border rounded-xl p-4">
                <Chatbot sessionId={sessionId} />
              </div>
            )}
          </section>
        </div>

        <div className="h-16"></div>
      </div>
    </div>
  );
};

export default ResultsPage;
