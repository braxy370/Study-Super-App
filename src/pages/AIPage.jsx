import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Lightbulb, Brain, Loader2, Copy, Check, Timer, ListChecks, Zap, AlertTriangle, Wifi, WifiOff, Trash2, RefreshCw, Search } from 'lucide-react';

const QUICK_ACTIONS = [
  { id: 'focus', label: 'Focus tips', icon: Timer, prompt: 'How do I stay focused when I keep getting distracted?' },
  { id: 'plan', label: 'Plan my day', icon: ListChecks, prompt: 'Help me plan a productive day — I have a lot to do' },
  { id: 'motivate', label: 'Motivation', icon: Zap, prompt: 'I\'m struggling to stay motivated. What actually works?' },
  { id: 'learn', label: 'Study tips', icon: Brain, prompt: 'What\'s the most effective way to study and actually remember things?' },
  { id: 'habit', label: 'Build habits', icon: Lightbulb, prompt: 'How do I build a daily habit that actually sticks?' },
];

const LOADING_MESSAGES = [
  'Thinking about this…',
  'Putting it together…',
  'Simplifying the answer…',
  'Almost ready…',
];

const SEARCH_LOADING_MESSAGES = [
  'Checking the latest info…',
  'Looking for recent updates…',
  'Verifying current details…',
  'Summarizing what I found…',
];

// ── Lightweight Markdown Renderer ──────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1 ? 'text-base font-bold text-white' : level === 2 ? 'text-sm font-bold text-white' : 'text-sm font-semibold text-white/90';
      elements.push(<div key={i} className={`${cls} mt-1`}>{inlineFormat(headingMatch[2])}</div>);
      i++;
      continue;
    }

    if (/^\d+[\.\\)]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\d+[\.\\)]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\d+[\.\\)]\s+/, '');
        listItems.push(<li key={i} className="ml-1">{inlineFormat(content)}</li>);
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1.5 text-sm text-gray-200 marker:text-neon-cyan/70 marker:font-semibold">
          {listItems}
        </ol>
      );
      continue;
    }

    if (/^[\-\•\*]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^[\-\•\*]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^[\-\•\*]\s+/, '');
        listItems.push(<li key={i} className="ml-1">{inlineFormat(content)}</li>);
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1.5 text-sm text-gray-200 marker:text-neon-cyan/50">
          {listItems}
        </ul>
      );
      continue;
    }

    elements.push(<p key={i} className="text-sm text-gray-200 leading-relaxed">{inlineFormat(line)}</p>);
    i++;
  }

  return <div className="space-y-1.5">{elements}</div>;
}

function inlineFormat(text) {
  if (!text) return text;
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
      parts.push(<strong key={key++} className="font-semibold text-white">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index)}</span>);
      parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-white/8 text-neon-cyan/80 text-xs font-mono">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ── Client-side complexity detection ──────────────────────────────
const DEEP_CLIENT_SIGNALS = [
  'step by step', 'walk me through', 'in detail', 'explain deeply',
  'thoroughly', 'complete guide', 'pros and cons',
  'difference between', 'compare',
  'debug', 'troubleshoot', 'architecture', 'design pattern',
  'algorithm', 'complexity', 'implement',
];

function isSimpleQuestion(message) {
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).length;
  if (wordCount <= 5 && /^(hi|hey|hello|thanks|thank you|ok|got it|cool|yo|sup)\b/.test(lower)) return true;
  if (DEEP_CLIENT_SIGNALS.some(s => lower.includes(s))) return false;
  if (/[{}<>=;]|```|function |class |import |const |let |var /.test(message)) return false;
  if (wordCount > 15 && lower.includes('?')) return false;
  return wordCount <= 15;
}

// ── Client-side search detection (lightweight mirror) ─────────────
// Used ONLY to pick the right loading messages and adjust client timeouts.
// The server makes the actual search decision.
const CLIENT_SEARCH_HINTS = [
  'latest', 'current price', 'current weather', 'today\'s', 'tonight\'s',
  'live score', 'release date', 'exam date', 'exam result',
  'news', 'trending', 'upcoming', 'new version',
  'this week', 'this month', 'right now',
];

const CLIENT_SEARCH_ENTITIES = [
  /\bmlbb\b/i, /\bipl\b/i, /\bworld\s*cup\b/i,
  /\bbitcoin\b/i, /\bethereum\b/i, /\bcrypto\b/i,
  /\bassam\s*polytechnic\b/i,
];

function looksLikeSearchQuery(message) {
  const lower = message.toLowerCase().trim();
  if (CLIENT_SEARCH_HINTS.some(s => lower.includes(s))) return true;
  if (CLIENT_SEARCH_ENTITIES.some(p => p.test(message))) return true;
  return false;
}

// ── Contextual Fallback Generator ─────────────────────────────────
function getContextualFallback(input) {
  const lower = input.toLowerCase().trim();
  const topic = extractTopic(input);

  if (/^(how to|how do i|how can i)\b/.test(lower)) {
    return buildHowToFallback(topic, input);
  }
  if (/^(what is|what are|what's|define|meaning of)\b/.test(lower)) {
    return buildDefinitionFallback(topic, input);
  }
  if (/^(tips for|ways to|best way to)\b/.test(lower)) {
    return buildTipsFallback(topic, input);
  }
  if (/^(should i|which is better|is it)\b/.test(lower)) {
    return buildComparisonFallback(topic, input);
  }

  return buildGenericFallback(topic, input);
}

function extractTopic(input) {
  return input
    .replace(/^(how to|how do i|how can i|what is|what are|what's|define|meaning of|tips for|ways to|best way to|should i|can you|tell me about|give me|explain)\s+/i, '')
    .replace(/[?.!]+$/, '')
    .trim();
}

function buildHowToFallback(topic, _original) {
  return `That took a bit longer than expected, but here's a quick starting point for **${topic}**:

1. **Start with the basics** — look up the core materials or tools you'll need
2. **Find a simple tutorial** — a beginner-friendly guide will get you moving fast
3. **Practice the first step** — don't try to master everything at once, just start

I can give you a more detailed walkthrough — just tap retry below.`;
}

function buildDefinitionFallback(topic, _original) {
  return `The full explanation for **${topic}** is taking a moment to process.

In the meantime — this is a great question to explore. Try asking again and I'll break it down clearly for you with examples.

**Quick tip:** Shorter, focused questions tend to get faster answers.`;
}

function buildTipsFallback(topic, _original) {
  return `I was putting together tips for **${topic}** but the response took too long.

Here's a quick framework while I process:
- **Start small** — pick one thing to focus on first
- **Be consistent** — regular practice beats intensity
- **Track your progress** — seeing improvement keeps you motivated

Tap retry for the full detailed version.`;
}

function buildComparisonFallback(topic, _original) {
  return `I was working on that comparison about **${topic}** but it took longer than expected.

For most comparison questions, consider:
- **Your specific situation** — what matters most to you?
- **Pros and cons** — every option has trade-offs
- **Try before you commit** — test small before going all-in

Retry and I'll give you a proper breakdown.`;
}

function buildGenericFallback(topic, _original) {
  const displayTopic = topic.length > 60 ? topic.slice(0, 57) + '…' : topic;

  return `I was working on your question about **${displayTopic}** but it took longer than expected.

Here's what I'd suggest:
- **Try again** — it usually works on the second attempt
- **Simplify the question** — breaking it into smaller parts gets faster results
- **Be specific** — the more focused the question, the quicker the answer

Tap retry below and I'll get right on it.`;
}

// ── API call with smart retry strategy ────────────────────────────
async function callAI(message, history) {
  const simple = isSimpleQuestion(message);
  const isSearch = looksLikeSearchQuery(message);

  if (simple && !isSearch) {
    // Simple non-search questions: try fast-path FIRST for speed
    const result = await doFetch(message, history, true, 10000);
    if (result.ok) return result;
    if (result.permanent) return result;

    const result2 = await doFetch(message, history, false, 12000);
    if (result2.ok) return result2;

    return result.error ? result : result2;
  } else if (isSearch) {
    // Search queries: give more time, no fast-path first attempt
    const result = await doFetch(message, history, false, 18000);
    if (result.ok) return result;
    if (result.permanent) return result;

    // Retry with fast-path (will skip search server-side)
    const result2 = await doFetch(message, history, true, 8000);
    if (result2.ok) return result2;

    return result.error ? result : result2;
  } else {
    // Complex non-search questions: try normal path first
    const result = await doFetch(message, history, false, 14000);
    if (result.ok) return result;
    if (result.permanent) return result;

    const result2 = await doFetch(message, history, true, 8000);
    if (result2.ok) return result2;

    return result.error ? result : result2;
  }
}

async function doFetch(message, history, fast, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, fast }),
      signal: controller.signal,
      keepalive: true,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errMsg = data.error || `Something went wrong`;
      const permanent = res.status === 400 || (res.status === 500 && data.code !== 'TIMEOUT');
      return { ok: false, error: errMsg, permanent, code: data.code };
    }

    const data = await res.json();
    return {
      ok: true,
      response: data.response,
      fast,
      tier: data.tier,
      elapsed: data.elapsed,
      grounded: data.grounded || false,
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      return { ok: false, error: null, permanent: false, code: 'CLIENT_TIMEOUT' };
    }
    return { ok: false, error: null, permanent: false, code: 'NETWORK_ERROR' };
  }
}


// ── Component ─────────────────────────────────────────────────────
export default function AIPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [apiStatus, setApiStatus] = useState('checking');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [isSearching, setIsSearching] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetch('/api/health')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (data.ai === 'connected') setApiStatus('online');
        else if (data.ai === 'invalid_key') setApiStatus('invalid_key');
        else if (data.ai === 'model_error') setApiStatus('model_error');
        else setApiStatus('offline');
      })
      .catch(() => setApiStatus('offline'));
  }, []);

  // Rotate loading messages every 2s — use search messages when appropriate
  useEffect(() => {
    if (!isLoading) return;
    const msgs = isSearching ? SEARCH_LOADING_MESSAGES : LOADING_MESSAGES;
    setLoadingMsg(msgs[0]);
    let idx = 0;
    const interval = setInterval(() => {
      idx = Math.min(idx + 1, msgs.length - 1);
      setLoadingMsg(msgs[idx]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading, isSearching]);

  const handleSend = useCallback(async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || isLoading) return;
    if (requestRef.current) return;
    requestRef.current = true;

    setInput('');
    const userMsg = { id: Date.now(), role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setIsSearching(looksLikeSearchQuery(userMessage));

    const historyForAPI = messages.map(m => ({ role: m.role, content: m.content }));
    const result = await callAI(userMessage, historyForAPI);

    let responseContent;
    let isOffline = false;
    let grounded = false;

    if (result.ok) {
      responseContent = result.response;
      grounded = result.grounded;
      setApiStatus('online');
    } else if (result.error) {
      responseContent = getContextualFallback(userMessage);
      isOffline = true;
    } else {
      responseContent = getContextualFallback(userMessage);
      isOffline = true;
      setApiStatus('offline');
    }

    setMessages(prev => [...prev, {
      id: Date.now() + 1,
      role: 'assistant',
      content: responseContent,
      isOffline,
      grounded,
      originalQuestion: isOffline ? userMessage : null,
    }]);
    setIsLoading(false);
    setIsSearching(false);
    requestRef.current = null;
  }, [input, isLoading, messages]);

  const handleRetry = useCallback(async (originalQuestion) => {
    if (isLoading || !originalQuestion) return;
    handleSend(originalQuestion);
  }, [isLoading, handleSend]);

  const handleQuickAction = (action) => { handleSend(action.prompt); };

  const handleCopy = (content, id) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => { setMessages([]); };

  return (
    <div className="flex flex-col gap-4 py-4 min-h-[calc(100dvh-140px)]">
      {/* Header */}
      <motion.div
        className="text-center py-2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-electric-purple/20 to-neon-cyan/20 flex items-center justify-center mx-auto mb-2 border border-white/10">
          <Sparkles size={22} className="text-neon-cyan" />
        </div>
        <h2 className="text-lg font-bold text-white">AI Assistant</h2>
        <p className="text-xs text-gray-500 mt-0.5">Productivity tips, planning help, and motivation</p>

        <div className="flex items-center justify-center gap-1.5 mt-2">
          {apiStatus === 'online' ? (
            <>
              <Wifi size={10} className="text-accent-green" />
              <span className="text-[10px] text-accent-green font-medium">Gemini AI Connected</span>
            </>
          ) : apiStatus === 'invalid_key' ? (
            <>
              <AlertTriangle size={10} className="text-accent-rose" />
              <span className="text-[10px] text-accent-rose font-medium">Invalid API Key</span>
            </>
          ) : apiStatus === 'model_error' ? (
            <>
              <AlertTriangle size={10} className="text-accent-amber" />
              <span className="text-[10px] text-accent-amber font-medium">Model Unavailable</span>
            </>
          ) : apiStatus === 'checking' ? (
            <>
              <Loader2 size={10} className="text-gray-500 animate-spin" />
              <span className="text-[10px] text-gray-500 font-medium">Checking connection...</span>
            </>
          ) : apiStatus === 'offline' ? (
            <>
              <WifiOff size={10} className="text-accent-amber" />
              <span className="text-[10px] text-accent-amber font-medium">Offline Mode</span>
            </>
          ) : null}
        </div>
      </motion.div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <motion.div
          className="flex flex-col gap-2.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {(apiStatus === 'offline' || apiStatus === 'invalid_key') && (
            <div className="glass-panel p-3 flex items-start gap-2.5">
              <AlertTriangle size={14} className="text-accent-amber shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed">
                {apiStatus === 'invalid_key'
                  ? 'Your Gemini API key is invalid. Check your GEMINI_API_KEY in the server\'s .env file.'
                  : 'AI service is not connected. Responses will use built-in suggestions.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {QUICK_ACTIONS.map((action, i) => (
              <motion.button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="glass-panel p-3.5 flex flex-col items-center gap-2 text-center hover:bg-white/5 transition-all group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                disabled={isLoading}
              >
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-neon-cyan/10 transition-colors">
                  <action.icon size={16} className="text-gray-400 group-hover:text-neon-cyan transition-colors" />
                </div>
                <span className="text-[11px] font-medium text-gray-400 group-hover:text-white transition-colors">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          <div className="flex justify-end">
            <button
              onClick={handleClearChat}
              className="text-[10px] uppercase tracking-wider font-semibold text-gray-600 hover:text-gray-400 transition-colors px-2 py-1 flex items-center gap-1"
              disabled={isLoading}
            >
              <Trash2 size={10} />
              Clear Chat
            </button>
          </div>

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 relative group ${
                  msg.role === 'user'
                    ? 'bg-electric-purple/15 border border-electric-purple/20 text-white'
                    : 'glass-panel text-gray-200'
                }`}>
                  {msg.role === 'assistant' ? (
                    renderMarkdown(msg.content)
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}

                  {/* Grounded search indicator */}
                  {msg.role === 'assistant' && msg.grounded && !msg.isOffline && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
                      <Search size={10} className="text-neon-cyan/60" />
                      <span className="text-[10px] text-gray-500">Answered with latest information</span>
                    </div>
                  )}

                  {/* Warm failure footer with inline retry button */}
                  {msg.role === 'assistant' && msg.isOffline && (
                    <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-1.5">
                        <WifiOff size={10} className="text-gray-600" />
                        <span className="text-[10px] text-gray-500">Partial answer — full response was interrupted</span>
                      </div>
                      {msg.originalQuestion && (
                        <button
                          onClick={() => handleRetry(msg.originalQuestion)}
                          disabled={isLoading}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[10px] text-neon-cyan font-medium disabled:opacity-30"
                        >
                          <RefreshCw size={10} />
                          Retry
                        </button>
                      )}
                    </div>
                  )}

                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
                    >
                      {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="glass-panel px-4 py-3 flex items-center gap-2">
                {isSearching ? (
                  <Search size={14} className="text-neon-cyan animate-pulse" />
                ) : (
                  <Loader2 size={14} className="text-neon-cyan animate-spin" />
                )}
                <span className="text-sm text-gray-400">{loadingMsg}</span>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 pt-2">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="glass-panel flex items-center gap-2 pl-4 pr-2 py-1.5 focus-within:border-neon-cyan/30 transition-all"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none py-2"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-gradient-to-r from-electric-purple to-neon-cyan text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
