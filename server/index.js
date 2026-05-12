import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '16kb' }));

const SYSTEM_PROMPT = `You are FocusFlow AI, a productivity assistant embedded in a gamified focus app.

Your role:
- Help users plan tasks, manage time, build habits, and stay motivated
- Give step-by-step answers for complex questions
- Give concise answers for simple questions
- Stay strictly productivity-focused — do not help with unrelated topics
- Be honest when unsure — say "I'm not sure" rather than guessing
- Reference the app's features naturally (Pomodoro timer, streaks, XP, task categories)
- Use markdown formatting: **bold**, bullet points, numbered lists
- Keep responses under 300 words unless the user asks for detail
- Be warm, encouraging, and practical — never preachy

You must NOT:
- Generate code, write essays, or do homework
- Discuss politics, violence, or NSFW content
- Pretend to have real-time data, internet access, or memory of past conversations
- Roleplay as other characters`;

// Retry helper for transient Gemini errors
async function callGemini(ai, contents, retries = 1) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.9,
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
      console.log(`[AI] Transient error, retrying in 1.5s... (${err.message})`);
      await new Promise(r => setTimeout(r, 1500));
      return callGemini(ai, contents, retries - 1);
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

    console.log(`[AI] Request → gemini-3.1-flash-lite (${contents.length} messages)`);

    const response = await callGemini(ai, contents);
    const text = response.text?.trim();

    if (!text) {
      return res.status(502).json({ error: 'AI returned an empty response' });
    }

    console.log(`[AI] ✓ Success (${text.length} chars)`);
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

// --- Health check (fast, no Gemini call) ---
app.get('/api/health', (_req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.json({ status: 'ok', ai: 'missing_key' });
  return res.json({ status: 'ok', ai: 'connected' });
});

// --- Start ---
app.listen(PORT, () => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  console.log(`\n  🚀 FocusFlow API running at http://localhost:${PORT}`);
  console.log(`  🔑 Gemini key: ${hasKey ? 'loaded ✓' : 'MISSING — set GEMINI_API_KEY in .env'}\n`);
});
