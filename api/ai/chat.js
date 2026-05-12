import { GoogleGenAI } from '@google/genai';

// ── Prompts ──────────────────────────────────────────────────────
// Duplicated from server/prompt.js because Vercel can't import from outside api/

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

const FAST_SYSTEM_PROMPT = `You are FocusFlow AI — a calm, helpful assistant.
Answer directly in 2-4 sentences. Be clear and practical. Use **bold** for key terms.
Do not write long responses. Do not apologize. Do not use filler.`;

// ── Adaptive Config ──────────────────────────────────────────────

// Signals that REQUIRE deep analysis
const DEEP_SIGNALS = [
  'step by step', 'walk me through', 'in detail', 'explain deeply',
  'thoroughly', 'complete guide', 'pros and cons',
  'difference between', 'compare',
  'debug', 'troubleshoot', 'architecture', 'design pattern',
  'algorithm', 'complexity', 'implement',
];

// Signals indicating simple/casual questions
const CASUAL_SIGNALS = [
  'what is', 'what are', 'what\'s', 'define', 'meaning of',
  'yes or no', 'should i', 'which is better', 'is it',
  'thanks', 'thank you', 'ok', 'got it', 'cool', 'nice',
  'hi', 'hello', 'hey', 'sup', 'yo',
  'how to', 'how do i', 'how can i', 'tips for', 'ways to',
  'can you', 'tell me about', 'give me',
];

function getModelConfig(message) {
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;

  // Greetings and acknowledgements — ultra-fast
  if (wordCount <= 5 && /^(hi|hey|hello|thanks|thank you|ok|got it|cool|yo|sup)\b/.test(lower)) {
    return { maxOutputTokens: 150, temperature: 0.5, topP: 0.85, tier: 'greeting' };
  }

  // Explicit deep-analysis requests
  if (DEEP_SIGNALS.some(s => lower.includes(s))) {
    return { maxOutputTokens: 1536, temperature: 0.75, topP: 0.92, tier: 'deep' };
  }

  // Contains code, equations, or technical syntax
  if (/[{}<>=;]|```|function |class |import |const |let |var /.test(message)) {
    return { maxOutputTokens: 1024, temperature: 0.65, topP: 0.88, tier: 'moderate' };
  }

  // Long multi-part questions (15+ words with question marks)
  if (wordCount > 15 && lower.includes('?')) {
    return { maxOutputTokens: 1024, temperature: 0.72, topP: 0.9, tier: 'moderate' };
  }

  // Short casual questions (≤8 words) — ultra-fast path
  if (wordCount <= 8 && CASUAL_SIGNALS.some(s => lower.includes(s))) {
    return { maxOutputTokens: 400, temperature: 0.6, topP: 0.85, tier: 'fast' };
  }

  // Simple / casual questions — fast response
  if (wordCount <= 12 || CASUAL_SIGNALS.some(s => lower.includes(s))) {
    return { maxOutputTokens: 512, temperature: 0.65, topP: 0.88, tier: 'fast' };
  }

  // Default — moderate
  return { maxOutputTokens: 768, temperature: 0.7, topP: 0.9, tier: 'moderate' };
}

// ── Server-side timeout wrapper ──────────────────────────────────
// Races the Gemini call against a timeout so we can return a clean
// error before Vercel's 30s gateway limit kills the function.
const SERVER_TIMEOUT_MS = 20000; // 20s — leaves 10s buffer for Vercel

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SERVER_TIMEOUT')), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
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

  const startTime = Date.now();

  try {
    const { message, history, fast } = req.body || {};
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: 'AI service is not configured on the server.' });

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
    let config;
    let systemPrompt;

    if (fast) {
      config = { maxOutputTokens: 300, temperature: 0.5, topP: 0.85 };
      systemPrompt = FAST_SYSTEM_PROMPT;
    } else if (isFastTier) {
      // Use the lighter system prompt for fast-tier requests too
      config = { maxOutputTokens: adaptive.maxOutputTokens, temperature: adaptive.temperature, topP: adaptive.topP };
      systemPrompt = FAST_SYSTEM_PROMPT;
    } else {
      config = { maxOutputTokens: adaptive.maxOutputTokens, temperature: adaptive.temperature, topP: adaptive.topP };
      systemPrompt = SYSTEM_PROMPT;
    }

    // Use shorter server timeout for fast tiers
    const timeout = isFastTier ? 12000 : SERVER_TIMEOUT_MS;

    // Single attempt with server-side timeout protection
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
    return res.status(200).json({ response: text, tier, elapsed });

  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[AI Error] ${elapsed}ms |`, err.message?.slice(0, 200) || err);

    // Server-side timeout — return clean error before Vercel kills us
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
      return res.status(429).json({ error: 'High demand right now. Please try again in a moment.', code: 'RATE_LIMIT' });

    return res.status(502).json({ error: 'AI is taking longer than expected. Try again.', code: 'SERVER_ERROR' });
  }
}
