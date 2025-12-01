import express from 'express';
import { getSession, updateSession } from '../utils/sessionStore';
import { askGemini } from '../services/gemini';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message required' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Build context from session
    const contextParts = [
      'You are an expert fashion authenticator helping a user understand their item.',
      '',
      'Item Analysis Summary:',
      `- Brand: ${session.analysis.brand.name}`,
      `- Authenticity Score: ${session.analysis.authenticity.score}/100`,
      `- Verdict: ${session.analysis.authenticity.verdict || 'N/A'}`,
      `- Condition: ${session.analysis.condition.description} (${session.analysis.condition.score}/5)`,
      `- Era: ${session.analysis.era.classification}`,
    ];

    // Add pricing info
    if (session.analysis.priceEstimate.retail_price) {
      contextParts.push(
        `- Original Retail Price: ₹${session.analysis.priceEstimate.retail_price.inr} / $${session.analysis.priceEstimate.retail_price.usd}`
      );
    }
    contextParts.push(
      `- Current Market Value: ₹${session.analysis.priceEstimate.current_market_price.inr.median} / $${session.analysis.priceEstimate.current_market_price.usd.median}`
    );

    // Add rarity if available
    if (session.analysis.rarity) {
      contextParts.push(`- Rarity: ${session.analysis.rarity.toUpperCase()}`);
    }

    contextParts.push('', 'Previous conversation:');

    session.conversationHistory.forEach((msg) => {
      contextParts.push(`${msg.role}: ${msg.content}`);
    });

    contextParts.push('', `User's new question: ${message}`);

    const context = contextParts.join('\n');

    // Get response from Gemini Flash (uses Google AI Studio API key)
    console.log('💬 Using Gemini Flash for chat continuation...');
    const response = await askGemini(message, context);

    // Update conversation history
    session.conversationHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    );
    await updateSession(sessionId, session);

    res.json({ response });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Chat failed',
      details: error.message,
    });
  }
});

export default router;