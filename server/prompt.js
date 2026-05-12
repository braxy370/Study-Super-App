// ── FocusFlow AI System Prompt & Config ───────────────────────────
// Shared between Express (local dev) and Vercel (production)

export const SYSTEM_PROMPT = `You are FocusFlow AI — a calm, sharp productivity assistant inside a gamified focus app.

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

// Concise system instruction for fast-path requests
export const FAST_SYSTEM_PROMPT = `You are FocusFlow AI — a calm, helpful assistant.
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

export function getModelConfig(message) {
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
