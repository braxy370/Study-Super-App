import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT, getModelConfig } from './prompt.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '16kb' }));

// Retry helper for transient Gemini errors
async function callGemini(ai, contents, config, retries = 1) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        ...config,
      },
    });
    return response;
  } catch (err) {
    const isTransient =
      err.message?.includes('503') ||
      err.message?.includes('429') ||
      err.message?.includes('UNAVAILABLE') ||
      err.message?.includes('RESOURCE_EXHAUSTED') ||
      err.message?.includes('fetch failed') ||
      err.message?.includes('ECONNRESET');

    if (isTransient && retries > 0) {
      console.log(`[AI] Transient error, retrying... (${err.message?.slice(0, 80)})`);
      await new Promise(r => setTimeout(r, 1500));
      return callGemini(ai, contents, config, retries - 1);
    }
    throw err;
  }
}

// --- Chat endpoint ---
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

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
    const contents = [];

    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'assistant' || msg.role === 'model') {
          contents.push({ role: 'model', parts: [{ text: msg.content }] });
        }
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // Adaptive config based on question complexity
    const config = getModelConfig(message);
    console.log(`[AI] Request → gemini-3.1-flash-lite | tokens:${config.maxOutputTokens} temp:${config.temperature} (${contents.length} msgs)`);

    const response = await callGemini(ai, contents, config);
    const text = response.text?.trim();

    if (!text) {
      return res.status(502).json({ error: 'AI returned an empty response' });
    }

    console.log(`[AI] ✓ ${text.length} chars`);
    return res.json({ response: text });

  } catch (err) {
    console.error('[AI Error]', err.message || err);

    if (err.message?.includes('API key not valid') || err.message?.includes('API_KEY_INVALID')) {
      return res.status(500).json({ error: 'AI API key is invalid. Check GEMINI_API_KEY in .env.', code: 'INVALID_KEY' });
    }
    if (err.message?.includes('not found') || err.message?.includes('does not exist')) {
      return res.status(500).json({ error: 'AI model not available.', code: 'MODEL_ERROR' });
    }
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ error: 'Too many requests. Wait a moment and try again.' });
    }

    return res.status(502).json({ error: 'AI service is temporarily unavailable. Please try again.' });
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
