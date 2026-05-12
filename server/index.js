import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT, FAST_SYSTEM_PROMPT, getModelConfig } from './prompt.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '16kb' }));

// ── Server-side timeout wrapper ──────────────────────────────────
const SERVER_TIMEOUT_MS = 20000;

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SERVER_TIMEOUT')), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// --- Chat endpoint ---
app.post('/api/ai/chat', async (req, res) => {
  const startTime = Date.now();

  try {
    const { message, history, fast } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'AI service is not configured. Add GEMINI_API_KEY to .env.' });
    }

    const ai = new GoogleGenAI({ apiKey: key });

    // Determine adaptive config FIRST so we can tailor history limits
    const adaptive = fast ? null : getModelConfig(message);
    const tier = fast ? 'fast-retry' : adaptive.tier;
    const isFastTier = tier === 'fast' || tier === 'greeting' || tier === 'fast-retry';

    // Build conversation contents — aggressively trim for fast tiers
    const contents = [];
    if (Array.isArray(history)) {
      const historyLimit = isFastTier ? 2 : 8;
      for (const msg of history.slice(-historyLimit)) {
        if (msg.role === 'user') contents.push({ role: 'user', parts: [{ text: msg.content }] });
        else if (msg.role === 'assistant' || msg.role === 'model') contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // Choose config
    let config, systemPrompt;

    if (fast) {
      config = { maxOutputTokens: 300, temperature: 0.5, topP: 0.85 };
      systemPrompt = FAST_SYSTEM_PROMPT;
      console.log(`[AI] Fast-retry request (${contents.length} msgs)`);
    } else if (isFastTier) {
      config = { maxOutputTokens: adaptive.maxOutputTokens, temperature: adaptive.temperature, topP: adaptive.topP };
      systemPrompt = FAST_SYSTEM_PROMPT;
      console.log(`[AI] ${tier} tier (light prompt) | tokens:${adaptive.maxOutputTokens} temp:${adaptive.temperature} (${contents.length} msgs)`);
    } else {
      config = { maxOutputTokens: adaptive.maxOutputTokens, temperature: adaptive.temperature, topP: adaptive.topP };
      systemPrompt = SYSTEM_PROMPT;
      console.log(`[AI] ${tier} tier | tokens:${adaptive.maxOutputTokens} temp:${adaptive.temperature} (${contents.length} msgs)`);
    }

    // Use shorter timeout for fast tiers
    const timeout = isFastTier ? 12000 : SERVER_TIMEOUT_MS;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: { systemInstruction: systemPrompt, ...config },
      }),
      timeout,
    );

    const text = response.text?.trim();
    if (!text) return res.status(502).json({ error: 'AI returned an empty response' });

    const elapsed = Date.now() - startTime;
    console.log(`[AI] ✓ ${text.length} chars | ${elapsed}ms | ${tier}`);
    return res.json({ response: text, tier, elapsed });

  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[AI Error] ${elapsed}ms |`, err.message?.slice(0, 200) || err);

    if (err.message === 'SERVER_TIMEOUT') {
      return res.status(504).json({
        error: 'Response took too long. Try again — it usually works on retry.',
        code: 'TIMEOUT',
        elapsed,
      });
    }

    if (err.message?.includes('API key not valid') || err.message?.includes('API_KEY_INVALID'))
      return res.status(500).json({ error: 'AI API key is invalid.', code: 'INVALID_KEY' });
    if (err.message?.includes('not found') || err.message?.includes('does not exist'))
      return res.status(500).json({ error: 'AI model not available.', code: 'MODEL_ERROR' });
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED'))
      return res.status(429).json({ error: 'High demand right now. Try again in a moment.', code: 'RATE_LIMIT' });

    return res.status(502).json({ error: 'AI is taking longer than expected. Try again.', code: 'SERVER_ERROR' });
  }
});

// --- Health check ---
app.get('/api/health', (_req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.json({ status: 'ok', ai: 'missing_key' });
  return res.json({ status: 'ok', ai: 'connected' });
});

app.listen(PORT, () => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  console.log(`\n  🚀 FocusFlow API running at http://localhost:${PORT}`);
  console.log(`  🔑 Gemini key: ${hasKey ? 'loaded ✓' : 'MISSING — set GEMINI_API_KEY in .env'}\n`);
});
