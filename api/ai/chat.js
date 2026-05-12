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

**Technical/engineering questions → clear structured breakdown**
User: "Explain normalization in DBMS"
You: "**Normalization** is the process of organizing a database to reduce redundancy and improve data integrity.

**1NF** — Make sure every column holds only atomic (single) values. No repeating groups.

**2NF** — Remove partial dependencies. Every non-key column must depend on the *entire* primary key, not just part of it.

**3NF** — Remove transitive dependencies. Non-key columns shouldn't depend on other non-key columns.

Think of it like cleaning up a messy spreadsheet — each level removes one more type of unnecessary duplication."

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

## For technical/engineering topics
- Start with the concept definition (1-2 sentences)
- Follow with the key points or steps
- Use practical examples over abstract theory
- Use code snippets only when they genuinely clarify something
- Keep analogies short and natural — one line max

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
- Engineering subjects: DBMS, C, algorithms, networking, OS
- The app's features: Pomodoro timer, streaks, XP, task categories

## Hard rules
- Never write full essays, assignments, or homework solutions
- Never discuss politics, violence, or NSFW content
- Never pretend to have internet access or remember past conversations
- If a question is outside your scope, say so briefly and redirect`;

const FAST_SYSTEM_PROMPT = `You are FocusFlow AI — a calm, helpful assistant.
Answer directly in 2-4 sentences. Be clear and practical. Use **bold** for key terms.
Do not write long responses. Do not apologize. Do not use filler.`;

const GROUNDED_ADDENDUM = `
## When using web search results
- Lead with the direct answer based on what you found
- Naturally mention when information is recent: "Based on the latest updates..." or "As of now..."
- Do NOT fabricate sources, URLs, or citations
- Do NOT list raw URLs in your answer
- Do NOT say "According to my search results..." — just answer naturally
- If search results are unclear or conflicting, say so honestly
- Keep answers concise — summarize, don't dump everything you found
- Maintain the same calm, conversational tone as always`;

// ── Adaptive Config ──────────────────────────────────────────────
const DEEP_SIGNALS = [
  'step by step', 'walk me through', 'in detail', 'explain deeply',
  'thoroughly', 'complete guide', 'pros and cons',
  'difference between', 'compare',
  'debug', 'troubleshoot', 'architecture', 'design pattern',
  'algorithm', 'complexity', 'implement',
];

const CASUAL_SIGNALS = [
  'what is', 'what are', 'what\'s', 'define', 'meaning of',
  'yes or no', 'should i', 'which is better', 'is it',
  'thanks', 'thank you', 'ok', 'got it', 'cool', 'nice',
  'hi', 'hello', 'hey', 'sup', 'yo',
  'how to', 'how do i', 'how can i', 'tips for', 'ways to',
  'can you', 'tell me about', 'give me',
];

// ── Search Detection (multi-signal scoring) ──────────────────────

const STRONG_SEARCH_SIGNALS = [
  'latest version', 'latest update', 'latest news',
  'current price', 'current weather',
  'live score', 'release date', 'exam date', 'exam result',
  'admission date', 'admission update',
  'right now', 'today\'s', 'tonight\'s',
  'this week', 'this month',
];

const WEAK_SEARCH_SIGNALS = [
  { pattern: /\blatest\b/i, weight: 1 },
  { pattern: /\bcurrent\b/i, weight: 1 },
  { pattern: /\brecent\b/i, weight: 1 },
  { pattern: /\btoday\b/i, weight: 1 },
  { pattern: /\bnews\b/i, weight: 1 },
  { pattern: /\bupdate[sd]?\b/i, weight: 1 },
  { pattern: /\bprice\b/i, weight: 1 },
  { pattern: /\bweather\b/i, weight: 1.5 },
  { pattern: /\b(?:score|scores)\b/i, weight: 0.5 },
  { pattern: /\b(?:live)\b/i, weight: 0.5 },
  { pattern: /\b(?:match)\b/i, weight: 0.5 },
  { pattern: /\bevent\b/i, weight: 0.5 },
  { pattern: /\b20(?:2[4-9]|3\d)\b/i, weight: 0.8 },
  { pattern: /\btrending\b/i, weight: 1.5 },
  { pattern: /\bupcoming\b/i, weight: 1.5 },
  { pattern: /\bnew version\b/i, weight: 1.5 },
];

const STATIC_KNOWLEDGE_PATTERNS = [
  /\b(?:what is|explain|define)\s+(?:a\s+)?(?:recursion|stack|queue|linked\s*list|tree|graph|array|hash\s*map|pointer|variable|function|loop|class|object|struct|union)/i,
  /\b(?:dbms|rdbms|normalization|sql|join|primary\s*key|foreign\s*key|er\s*diagram|relational\s*algebra)/i,
  /\b(?:algorithm|sorting|searching|binary\s*search|bubble\s*sort|merge\s*sort|quick\s*sort|dijkstra|bfs|dfs|dynamic\s*programming)/i,
  /\b(?:tcp|udp|osi\s*model|ip\s*address|subnet|dns|http|https|protocol|socket\s*programming)/i,
  /\b(?:process|thread|deadlock|mutex|semaphore|virtual\s*memory|paging|segmentation|scheduling|cpu\s*scheduling)/i,
  /\b(?:c\s*programming|printf|scanf|malloc|calloc|free|struct\s+in|pointer\s+in|array\s+in)/i,
  /\b(?:integral|derivative|differential|equation|matrix|determinant|eigenvalue|probability|statistics|regression)/i,
  /\b(?:newton|gauss|euler|fourier|laplace|bernoulli|theorem|proof|formula)/i,
  /\b(?:jee|gate|neet)\s+(?:preparation|syllabus|tips|strategy|question)/i,
  /\b(?:pomodoro|time\s*management|study\s*technique|focus\s*method|habit\s*loop)/i,
  /\b(?:event\s*loop|event\s*listener|event\s*handler|event\s*driven|event\s*bus|event\s*emitter)/i,
  /\b(?:regex|pattern\s*matching|string\s*matching|match\s*the|matching\s*algorithm)/i,
  /\b(?:current\s*(?:in|through|across|source|density|flow))/i,
  /\b(?:live\s*(?:wire|coding|session|stream|reload|server|preview))/i,
  /\b(?:score\s*(?:well|better|good|high|marks|in\s*exam))/i,
];

const ENTITY_BOOSTERS = [
  /\bmlbb\b/i, /\bfree\s*fire\b/i, /\bvalorant\b/i,
  /\bipl\b/i, /\bworld\s*cup\b/i, /\bchampions\s*league\b/i, /\bolympics\b/i,
  /\bbitcoin\b/i, /\bethereum\b/i, /\bcrypto\b/i,
  /\bassam\s*polytechnic\b/i,
  /\breact\s*(?:v|version)\b/i, /\bnode\s*(?:v|version)\b/i,
  /\bandroid\s*\d/i, /\bios\s*\d/i, /\biphone\s*\d/i,
  /\bgoogle\s*(?:pixel|io|i\/o)\b/i, /\bapple\s*(?:wwdc|event)\b/i,
  /\bsamsung\b/i, /\bnvidia\b/i,
];

function shouldUseSearch(message = '') {
  const lower = message.toLowerCase().trim();

  // 1. If static knowledge, NEVER search
  if (STATIC_KNOWLEDGE_PATTERNS.some(p => p.test(lower))) return false;

  // 2. Strong signal phrases — always search
  if (STRONG_SEARCH_SIGNALS.some(s => lower.includes(s))) return true;

  // 3. Score weak signals
  let score = 0;
  for (const { pattern, weight } of WEAK_SEARCH_SIGNALS) {
    if (pattern.test(message)) score += weight;
  }

  // 4. Entity boost
  if (ENTITY_BOOSTERS.some(p => p.test(message))) score += 1.0;

  // 5. Threshold
  return score >= 2.0;
}

function getModelConfig(message) {
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;

  if (wordCount <= 5 && /^(hi|hey|hello|thanks|thank you|ok|got it|cool|yo|sup)\b/.test(lower)) {
    return { maxOutputTokens: 150, temperature: 0.5, topP: 0.85, tier: 'greeting' };
  }
  if (DEEP_SIGNALS.some(s => lower.includes(s))) {
    return { maxOutputTokens: 1536, temperature: 0.75, topP: 0.92, tier: 'deep' };
  }
  if (/[{}<>=;]|```|function |class |import |const |let |var /.test(message)) {
    return { maxOutputTokens: 1024, temperature: 0.65, topP: 0.88, tier: 'moderate' };
  }
  if (wordCount > 15 && lower.includes('?')) {
    return { maxOutputTokens: 1024, temperature: 0.72, topP: 0.9, tier: 'moderate' };
  }
  if (wordCount <= 8 && CASUAL_SIGNALS.some(s => lower.includes(s))) {
    return { maxOutputTokens: 400, temperature: 0.6, topP: 0.85, tier: 'fast' };
  }
  if (wordCount <= 12 || CASUAL_SIGNALS.some(s => lower.includes(s))) {
    return { maxOutputTokens: 512, temperature: 0.65, topP: 0.88, tier: 'fast' };
  }
  return { maxOutputTokens: 768, temperature: 0.7, topP: 0.9, tier: 'moderate' };
}

// ── Server-side timeout wrapper ──────────────────────────────────
const SERVER_TIMEOUT_MS = 20000;
const GROUNDED_TIMEOUT_MS = 24000; // grounded requests get more time

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

    // Determine adaptive config FIRST so we can tailor everything
    const adaptive = fast ? null : getModelConfig(message);
    const useSearch = !fast && shouldUseSearch(message);
    const tier = fast ? 'fast-retry' : adaptive.tier;
    const isFastTier = tier === 'fast' || tier === 'greeting' || tier === 'fast-retry';

    // Build conversation contents — aggressively trim for fast tiers
    const contents = [];
    if (Array.isArray(history)) {
      const historyLimit = isFastTier ? 2 : (useSearch ? 4 : 8);
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
      config = { maxOutputTokens: adaptive.maxOutputTokens, temperature: adaptive.temperature, topP: adaptive.topP };
      systemPrompt = FAST_SYSTEM_PROMPT;
    } else {
      config = { maxOutputTokens: adaptive.maxOutputTokens, temperature: adaptive.temperature, topP: adaptive.topP };
      systemPrompt = SYSTEM_PROMPT;
    }

    // Append grounded addendum if using search
    if (useSearch) {
      systemPrompt = systemPrompt + GROUNDED_ADDENDUM;
      // Give grounded requests a slightly higher token budget for context
      config.maxOutputTokens = Math.max(config.maxOutputTokens, 768);
    }

    // Timeout: fast tier < normal < grounded
    const timeout = isFastTier ? 12000 : (useSearch ? GROUNDED_TIMEOUT_MS : SERVER_TIMEOUT_MS);

    // Build tools array
    const tools = useSearch ? [{ googleSearch: {} }] : [];

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: { systemInstruction: systemPrompt, ...config },
        tools,
      }),
      timeout,
    );

    const text = response.text?.trim();
    if (!text) return res.status(502).json({ error: 'AI returned an empty response' });

    const elapsed = Date.now() - startTime;
    return res.status(200).json({
      response: text,
      tier,
      elapsed,
      grounded: useSearch,
    });

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
      return res.status(429).json({ error: 'High demand right now. Please try again in a moment.', code: 'RATE_LIMIT' });

    return res.status(502).json({ error: 'AI is taking longer than expected. Try again.', code: 'SERVER_ERROR' });
  }
}
