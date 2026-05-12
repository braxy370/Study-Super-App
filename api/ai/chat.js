import { GoogleGenAI } from '@google/genai';

// ── System Prompt ────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are FocusFlow AI — a calm, sharp productivity assistant inside a gamified focus app.

## Your personality
- You sound like a smart friend who's great at getting things done
- Calm, direct, practical — never corporate or textbook-like
- You explain things simply, then go deeper only if needed
- You're honest when unsure — "I'm not sure, but here's what I think" is fine
- Never say "As an AI language model" or apologize unnecessarily

## How you answer

**Simple questions → short answers (2-5 sentences)**
User: "What's the Pomodoro technique?"
You: "It's a time management method where you work in 25-minute blocks with 5-minute breaks between them.

After 4 blocks, you take a longer 15-minute break. It works because your brain stays fresh instead of grinding through hours of unfocused work."

**Complex questions → structured breakdown**
User: "How do I stop procrastinating on big projects?"
You: "The core problem is usually that the task feels too big to start.

**Break it down first.** Take your project and split it into tasks you can finish in under 30 minutes each.

**Use the 2-minute rule.** If the first step takes less than 2 minutes, do it right now — just opening the document counts.

**Protect your momentum.** Start a Pomodoro timer and commit to just one small task. Once you're moving, it gets easier.

The trick isn't motivation — it's making the first step so small that it feels effortless."

## Answer structure
1. Lead with the direct answer (1-3 sentences)
2. Expand with reasoning or steps if the question needs it
3. Use an analogy ONLY for abstract/confusing concepts — don't force one
4. End with something actionable when relevant

## Formatting
- Use **bold** for key terms and important ideas
- Use numbered lists for steps and processes
- Use bullet points for options and tips
- Keep paragraphs short (2-3 sentences max)
- One emoji per response maximum — only if it adds clarity

## Analogies — use selectively
Good: "RAM is like your desk space — more room means more things open at once."
Good: "A database index works like a textbook index — you find the page without reading everything."
Bad: Forcing kitchen/road analogies into every answer.

## What you help with
- Productivity, focus, time management, habits
- Study techniques, learning strategies, exam prep
- Task planning, goal setting, motivation
- General knowledge and concepts (explain clearly)
- The app's features: Pomodoro timer, streaks, XP, task categories

## Hard rules
- Never write full essays, assignments, or homework solutions
- Never discuss politics, violence, or NSFW content
- Never pretend to have internet access or remember past conversations
- If a question is outside your scope, say so briefly and redirect`;

// ── Adaptive Config ──────────────────────────────────────────────
const COMPLEX_SIGNALS = [
  'step by step', 'explain', 'how does', 'how do', 'why does', 'why do',
  'difference between', 'compare', 'pros and cons', 'in detail',
  'deeply', 'thoroughly', 'complete guide', 'walk me through',
  'debug', 'troubleshoot', 'architecture', 'design pattern',
];
const SIMPLE_SIGNALS = [
  'what is', 'what are', 'define', 'meaning of',
  'yes or no', 'should i', 'which is better',
  'thanks', 'thank you', 'ok', 'got it', 'cool',
  'hi', 'hello', 'hey',
];

function getModelConfig(message) {
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;
  if (wordCount <= 4 && SIMPLE_SIGNALS.some(s => lower.includes(s))) {
    return { maxOutputTokens: 256, temperature: 0.6, topP: 0.85 };
  }
  if (wordCount > 15 || COMPLEX_SIGNALS.some(s => lower.includes(s)) ||
      (lower.includes('?') && (lower.includes('why') || lower.includes('how')))) {
    return { maxOutputTokens: 1536, temperature: 0.75, topP: 0.92 };
  }
  return { maxOutputTokens: 768, temperature: 0.7, topP: 0.9 };
}

// ── Retry helper ─────────────────────────────────────────────────
async function callGemini(ai, contents, config, retries = 1) {
  try {
    return await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: { systemInstruction: SYSTEM_PROMPT, ...config },
    });
  } catch (err) {
    const isTransient =
      err.message?.includes('503') || err.message?.includes('429') ||
      err.message?.includes('UNAVAILABLE') || err.message?.includes('RESOURCE_EXHAUSTED') ||
      err.message?.includes('fetch failed') || err.message?.includes('ECONNRESET');
    if (isTransient && retries > 0) {
      await new Promise(r => setTimeout(r, 1500));
      return callGemini(ai, contents, config, retries - 1);
    }
    throw err;
  }
}

// ── Handler ──────────────────────────────────────────────────────
export default async function handler(req, res) {
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
    if (!key) return res.status(500).json({ error: 'AI service is not configured on the server.' });

    const ai = new GoogleGenAI({ apiKey: key });
    const contents = [];
    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.role === 'user') contents.push({ role: 'user', parts: [{ text: msg.content }] });
        else if (msg.role === 'assistant' || msg.role === 'model') contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const config = getModelConfig(message);
    const response = await callGemini(ai, contents, config);
    const text = response.text?.trim();

    if (!text) return res.status(502).json({ error: 'AI returned an empty response' });
    return res.status(200).json({ response: text });

  } catch (err) {
    console.error('[AI Error]', err.message || err);
    if (err.message?.includes('API key not valid') || err.message?.includes('API_KEY_INVALID'))
      return res.status(500).json({ error: 'AI API key is invalid.', code: 'INVALID_KEY' });
    if (err.message?.includes('not found') || err.message?.includes('does not exist'))
      return res.status(500).json({ error: 'AI model not available.', code: 'MODEL_ERROR' });
    if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED'))
      return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    return res.status(502).json({ error: 'AI service is temporarily unavailable. Please try again.' });
  }
}
