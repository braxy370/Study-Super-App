import { GoogleGenAI } from '@google/genai';

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
    // Only retry transient errors (5xx, rate limit, network)
    const isTransient =
      err.message?.includes('503') ||
      err.message?.includes('429') ||
      err.message?.includes('UNAVAILABLE') ||
      err.message?.includes('RESOURCE_EXHAUSTED') ||
      err.message?.includes('fetch failed') ||
      err.message?.includes('ECONNRESET');

    if (isTransient && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return callGemini(ai, contents, retries - 1);
    }

    throw err;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({ error: 'AI service is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey: key });

    // Build conversation contents
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

    const response = await callGemini(ai, contents);
    const text = response.text?.trim();

    if (!text) {
      return res.status(502).json({ error: 'AI returned an empty response' });
    }

    return res.status(200).json({ response: text });

  } catch (err) {
    console.error('[AI Error]', err.message || err);

    if (err.message?.includes('API key not valid') || err.message?.includes('API_KEY_INVALID')) {
      return res.status(500).json({ error: 'AI API key is invalid. Please check your GEMINI_API_KEY.', code: 'INVALID_KEY' });
    }

    if (err.message?.includes('not found') || err.message?.includes('does not exist')) {
      return res.status(500).json({ error: 'AI model not available.', code: 'MODEL_ERROR' });
    }

    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED')) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }

    return res.status(502).json({ error: 'AI service is temporarily unavailable. Please try again.' });
  }
}
