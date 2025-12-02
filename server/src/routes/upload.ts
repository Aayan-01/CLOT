import express from 'express';
import { uploadMiddleware } from '../middleware/upload';
import os from 'os';
import fs from 'fs';
import path from 'path';
import gcs from '../services/gcs';
import firestore from '../services/firestore';
import { processImages } from '../utils/imageProcessor';
import { analyzeImages, computeAuthenticityWithAI, estimatePriceWithAI } from '../services/gemini';
import { saveSession } from '../utils/sessionStore';
import { v4 as uuidv4 } from 'uuid';
import { createThumbnailUrl } from '../utils/uploadUtil';
import { AnalysisResult } from '../types';

const router = express.Router();

// Helper function to parse list items from text
const parseListItems = (text: string): string[] => {
  const items = text
    .split('\n')
    .map((s: string) => s.replace(/^[-•*]\s*/, '').trim())
    .filter((s: string) => s.length > 0 && s.length < 200); // Filter out very long sentences
  
  return items;
};

// Helper function to extract platform names
const extractPlatformNames = (text: string): string[] => {
  const knownPlatforms = [
    'Grailed', 'Depop', 'eBay', 'Poshmark', 'Vinted', 'Vestiaire Collective',
    'The RealReal', 'StockX', 'GOAT', 'Stadium Goods', 'Mercari', 'Etsy',
    'Facebook Marketplace', 'Instagram', 'Craigslist', 'Carousell'
  ];
  
  const foundPlatforms: string[] = [];
  const lowerText = text.toLowerCase();
  
  // First, try to find known platforms
  knownPlatforms.forEach(platform => {
    if (lowerText.includes(platform.toLowerCase())) {
      foundPlatforms.push(platform);
    }
  });
  
  // If we found platforms, return them
  if (foundPlatforms.length > 0) {
    return foundPlatforms;
  }
  
  // Otherwise, try to split by common separators and return short names
  const parts = text.split(/[,;]|\sand\s|\sor\s/i);
  return parts
    .map(p => p.trim())
    .filter(p => p.length > 0 && p.length < 30) // Only short names
    .slice(0, 5); // Limit to 5 platforms
};

router.post('/analyze', uploadMiddleware, async (req, res) => {
  try {
    // Ensure AI backend is configured before doing heavy work
    if (!process.env.GOOGLE_CLOUD_GEMINI_API_KEY) {
      console.warn('🔕 /analyze called but GOOGLE_CLOUD_GEMINI_API_KEY not configured');
      return res.status(503).json({ error: 'AI backend not configured', details: 'Missing GOOGLE_CLOUD_GEMINI_API_KEY' });
    }
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const files = req.files as Express.Multer.File[];

    // Create a temporary working dir on the container (Cloud Run has /tmp)
    const tmpDir = path.join(os.tmpdir(), 'cloth-uploads');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // Write multer buffers to temporary files so downstream code (sharp + Gemini) can read them
    const localPaths: string[] = [];
    for (const f of files) {
      if (!f.buffer) continue; // skip if nothing
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(f.originalname || '')}`;
      const localPath = path.join(tmpDir, uniqueName);
      fs.writeFileSync(localPath, f.buffer);
      localPaths.push(localPath);
    }

    // Step 1: Process images (create thumbnails from local files)
    console.log('🖼️  Processing images...');
    const thumbnails = await processImages(localPaths);

    // Step 2: Analyze images with Gemini Pro Vision using Master Prompt
    console.log('🔍 Analyzing images with Gemini Pro Vision (Master Prompt)...');
    const visionResults = await analyzeImages(localPaths);
    
    // Parse the response for structured data
    const rawAnalysis = visionResults.rawResponse;

    // Step 3: Compute authenticity score with AI
    console.log('🔐 Computing authenticity score with AI...');
    const authenticityResult = await computeAuthenticityWithAI(localPaths, visionResults);

    // Step 4: Estimate price with AI
    console.log('💰 Estimating price with AI...');
    const priceEstimate = await estimatePriceWithAI(
      localPaths,
      visionResults,
      authenticityResult,
      req.body.location || 'India'
    );

    // Step 5: Parse additional fields from Master Prompt response
    console.log('📊 Parsing detailed analysis from Master Prompt response...');
    
    // Extract rarity
    let rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic' = 'common';
    const rarityMatch = rawAnalysis.match(/\b(common|uncommon|rare|epic|legendary|mythic)\b/i);
    if (rarityMatch) {
      rarity = rarityMatch[1].toLowerCase() as typeof rarity;
    }

    // Extract era/decade
    let eraClassification = 'Modern';
    let eraRationale = 'Based on style and condition indicators';
    let decade = '';
    
    const eraSection = rawAnalysis.match(/###?\s*3\.\s*ERA\s*&\s*DATING([\s\S]*?)(?=###|$)/i);
    if (eraSection) {
      const eraText = eraSection[1];
      eraClassification = eraText.split('\n')[0]?.trim() || eraClassification;
      eraRationale = eraText.substring(eraText.indexOf('\n')).trim() || eraRationale;
      
      // Extract decade if mentioned
      const decadeMatch = eraText.match(/\b(19\d0s|20\d0s|1940s|1950s|1960s|1970s|1980s|1990s|2000s|2010s|2020s)\b/i);
      if (decadeMatch) {
        decade = decadeMatch[1];
      }
    }

    // Extract detailed features
    const detailedFeatures: any = {};
    const featuresSection = rawAnalysis.match(/###?\s*4\.\s*DETAILED\s*FEATURES([\s\S]*?)(?=###|$)/i);
    if (featuresSection) {
      const featuresText = featuresSection[1];
      
      // Material
      const materialMatch = featuresText.match(/material[s]?[:\s]+(.*?)(?:\n|$)/i);
      if (materialMatch) detailedFeatures.material = materialMatch[1].trim();
      
      // Color
      const colorMatch = featuresText.match(/color[s]?[:\s]+(.*?)(?:\n|$)/i);
      if (colorMatch) detailedFeatures.color = colorMatch[1].trim();
      
      // Pattern
      const patternMatch = featuresText.match(/pattern[s]?[:\s]+(.*?)(?:\n|$)/i);
      if (patternMatch) detailedFeatures.pattern = patternMatch[1].trim();
      
      // Size
      const sizeMatch = featuresText.match(/size[s]?[:\s]+(.*?)(?:\n|$)/i);
      if (sizeMatch) detailedFeatures.size = sizeMatch[1].trim();
      
      // Care instructions
      const careMatch = featuresText.match(/care\s+instruction[s]?[:\s]+(.*?)(?:\n|$)/i);
      if (careMatch) detailedFeatures.careInstructions = careMatch[1].trim();
      
      // Country of manufacture
      const countryMatch = featuresText.match(/country\s+of\s+manufacture[:\s]+(.*?)(?:\n|$)/i);
      if (countryMatch) detailedFeatures.countryOfManufacture = countryMatch[1].trim();
    }

    // Extract additional observations
    const additionalObservations: any = {};
    const obsSection = rawAnalysis.match(/###?\s*6\.\s*ADDITIONAL\s*OBSERVATIONS([\s\S]*?)(?=###|$)/i);
    if (obsSection) {
      const obsText = obsSection[1];
      
      // Cultural significance
      const culturalMatch = obsText.match(/cultural.*?significance[:\s]+(.*?)(?:\n\n|investment|styling|comparable|resale|$)/is);
      if (culturalMatch) additionalObservations.culturalSignificance = culturalMatch[1].trim();
      
      // Note: Styling suggestions and comparable items are no longer requested or stored.
      
      // Investment potential
      const investmentMatch = obsText.match(/investment\s+potential[:\s]+(.*?)(?=\n\n|styling|comparable|resale|cultural|$)/is);
      if (investmentMatch) additionalObservations.investmentPotential = investmentMatch[1].trim();
      
      // Resale platforms - IMPROVED PARSING
      const resaleMatch = obsText.match(/resale\s+platform[s]?[:\s]+([\s\S]*?)(?=\n\n|investment|styling|comparable|cultural|$)/i);
      if (resaleMatch) {
        const platformText = resaleMatch[1].trim();
        const platforms = extractPlatformNames(platformText);
        if (platforms.length > 0) additionalObservations.resalePlatforms = platforms;
      }
    }

    // Extract brand info
    let brandName = authenticityResult.detectedBrand || 'Unknown';
    let brandConfidence = authenticityResult.confidence || 50;
    
    const brandSection = rawAnalysis.match(/###?\s*1\.\s*BRAND\s*IDENTIFICATION([\s\S]*?)(?=###|$)/i);
    if (brandSection) {
      const brandText = brandSection[1];
      const nameMatch = brandText.match(/brand[:\s]+([A-Za-z0-9\s&'-]+)/i);
      if (nameMatch) brandName = nameMatch[1].trim();
      
      const confMatch = brandText.match(/confidence[:\s]+(\d+)/i);
      if (confMatch) brandConfidence = parseInt(confMatch[1]);
    }

    // Extract condition info
    let conditionScore = 3;
    let conditionDesc = 'Good condition based on visual analysis';
    let conditionTags: string[] = ['pre-owned', 'wearable'];
    
    const conditionSection = rawAnalysis.match(/###?\s*4\.\s*DETAILED\s*FEATURES([\s\S]*?)(?=###|$)/i);
    if (conditionSection) {
      const condText = conditionSection[1];
      const condMatch = condText.match(/condition[:\s]+(new|excellent|good|fair|poor)/i);
      if (condMatch) {
        const cond = condMatch[1].toLowerCase();
        conditionDesc = `${cond.charAt(0).toUpperCase() + cond.slice(1)} condition`;
        conditionScore = cond === 'new' ? 5 : cond === 'excellent' ? 4 : cond === 'good' ? 3 : cond === 'fair' ? 2 : 1;
        conditionTags = cond === 'new' ? ['new', 'unworn'] : ['pre-owned', cond];
      }
    }

    // Check if needs more images
    const needsMoreImages = /upload.*photo.*(?:neck\s+tag|care\s+label|close-up\s+stitching)/i.test(rawAnalysis);


    // Step 7: Compile final results
    const analysis: AnalysisResult = {
      authenticity: {
        score: authenticityResult.score,
        explanation: authenticityResult.explanation,
        confidence: authenticityResult.confidence,
        detectedBrand: authenticityResult.detectedBrand,
        redFlags: authenticityResult.redFlags,
        authenticityMarkers: authenticityResult.authenticityMarkers,
        verdict: authenticityResult.verdict,
      },
      brand: {
        name: brandName,
        confidence: brandConfidence,
        alternatives: [],
      },
      condition: {
        score: conditionScore,
        description: conditionDesc,
        tags: conditionTags,
      },
      era: {
        classification: eraClassification,
        rationale: eraRationale,
        decade: decade || undefined,
      },
      priceEstimate: priceEstimate,
      rarity: rarity,
      detailedFeatures: Object.keys(detailedFeatures).length > 0 ? detailedFeatures : undefined,
      additionalObservations: Object.keys(additionalObservations).length > 0 ? additionalObservations : undefined,
      // listing removed — Suggested listing section is intentionally not provided
      // Return absolute thumbnail URLs using the request origin so clients always get playable image URLs
      thumbnails: thumbnails.map(t => createThumbnailUrl(req, t)),
      warnings: [
        'This is an automated AI estimate – not a legal authenticity certificate.',
        'For high-value items, consult a professional authenticator.',
        authenticityResult.score < 70 ? '⚠️ Low authenticity score detected. Please verify before purchase.' : '',
        authenticityResult.redFlags && authenticityResult.redFlags.length > 0 
          ? `⚠️ Red flags detected: ${authenticityResult.redFlags.join(', ')}` 
          : '',
      ].filter(Boolean),
      needs_more_images: needsMoreImages,
    };

    // Step 8: Upload original images + thumbnails to GCS (if configured) and save session
    const uploadedOriginals: Array<{ objectName: string; publicUrl: string }> = [];
    const uploadedThumbs: Array<{ objectName: string; publicUrl: string }> = [];

    try {
      // Upload originals
      for (const lp of localPaths) {
        const dest = `uploads/originals/${path.basename(lp)}`;
        const r = await gcs.uploadFileToGCS(lp, dest).catch((e) => { throw e; });
        uploadedOriginals.push(r);
      }

      // Upload thumbnails
      for (const t of thumbnails) {
        const destT = `uploads/thumbnails/${path.basename(t)}`;
        const r2 = await gcs.uploadFileToGCS(t, destT).catch((e) => { throw e; });
        uploadedThumbs.push(r2);
      }
    } catch (gcsErr) {
      const gcsErrMsg = gcsErr instanceof Error ? gcsErr.message : String(gcsErr);
      console.warn('GCS upload failed, continuing — check configuration', gcsErrMsg);
    }

    // Remove temporary files (best-effort)
    for (const p of [...localPaths, ...thumbnails]) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) { /* no-op */ }
    }

    // If uploads to GCS were successful, update analysis.thumbnails to use public URLs
    if (uploadedThumbs.length > 0) {
      analysis.thumbnails = uploadedThumbs.map(t => t.publicUrl);
    } else {
      // fallback: keep local thumbnails URL using existing helper (may be /uploads in dev)
      analysis.thumbnails = thumbnails.map(t => createThumbnailUrl(req, t));
    }

    // Save session to session store (still uses local in-memory store by default)
    const sessionId = uuidv4();
    await saveSession(sessionId, {
      imagePaths: uploadedOriginals.length ? uploadedOriginals.map(o => o.publicUrl) : localPaths,
      analysis,
      conversationHistory: [],
    });

    // Log AI inputs & outputs into Firestore if available
    try {
      await firestore.logAnalysis(sessionId, {
        originals: uploadedOriginals,
        thumbnails: uploadedThumbs,
        analysis,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('Failed to write AI log to Firestore:', errMsg);
    }

    console.log('✅ Analysis complete!');
    res.json({ sessionId, analysis });
  } catch (error: any) {
    console.error('❌ Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message,
    });
  }
});

export default router;