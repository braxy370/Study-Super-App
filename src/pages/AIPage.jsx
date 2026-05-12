import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Lightbulb, Brain, Loader2, Copy, Check, Timer, ListChecks, Zap, AlertTriangle, Wifi, WifiOff, Trash2 } from 'lucide-react';

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

// ── Lightweight Markdown Renderer ──────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line → spacing
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Heading (### / ## / #)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const cls = level === 1 ? 'text-base font-bold text-white' : level === 2 ? 'text-sm font-bold text-white' : 'text-sm font-semibold text-white/90';
      elements.push(<div key={i} className={`${cls} mt-1`}>{inlineFormat(headingMatch[2])}</div>);
      i++;
      continue;
    }

    // Numbered list (1. / 2. etc.)
    if (/^\d+[\.\)]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\d+[\.\)]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\d+[\.\)]\s+/, '');
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

    // Bullet list (- / • / *)
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

    // Regular paragraph
    elements.push(<p key={i} className="text-sm text-gray-200 leading-relaxed">{inlineFormat(line)}</p>);
    i++;
  }

  return <div className="space-y-1.5">{elements}</div>;
}

// Inline formatting: **bold**, *italic*, `code`, emoji safe
function inlineFormat(text) {
  if (!text) return text;

  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, boldMatch.index)}</span>);
      }
      parts.push(<strong key={key++} className="font-semibold text-white">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, codeMatch.index)}</span>);
      }
      parts.push(<code key={key++} className="px-1.5 py-0.5 rounded bg-white/8 text-neon-cyan/80 text-xs font-mono">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // No more matches — push the rest
    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ── Fallback responses ────────────────────────────────────────────
function getOfflineResponse(input) {
  const lower = input.toLowerCase();

  if (lower.includes('focus') || lower.includes('concentrat') || lower.includes('distract')) {
    return `Here are some proven focus techniques:\n\n1. **Start with just 5 minutes** — momentum builds naturally\n2. **Use the Pomodoro timer** — it's right here in the app!\n3. **Single-task** — close all other tabs and apps\n4. **Time-block** — assign specific tasks to specific hours\n5. **Environment matters** — find a quiet, dedicated workspace\n\n💡 Try starting a 25-minute focus session now.`;
  }
  if (lower.includes('plan') || lower.includes('schedule') || lower.includes('organize')) {
    return `📋 Here's a productive daily framework:\n\n**Morning (High Energy)**\n• Tackle your hardest, most important task\n• Do deep work requiring concentration\n\n**Afternoon (Moderate Energy)**\n• Handle meetings, communication, and lighter tasks\n• Review progress on ongoing projects\n\n**Evening (Wind Down)**\n• Plan tomorrow's priorities\n• Reflect on what you accomplished\n\n🔥 Pair each block with a Pomodoro session for best results!`;
  }
  if (lower.includes('motivat') || lower.includes('procrast') || lower.includes('stuck') || lower.includes('lazy')) {
    return `💪 Here's what actually works against procrastination:\n\n1. **The 2-Minute Rule** — if it takes less than 2 minutes, do it now\n2. **Break it down** — large tasks feel overwhelming. Split into tiny steps.\n3. **Reward yourself** — complete a session, then take a proper break\n4. **Track your streak** — consistency beats intensity every time\n5. **Forgive yourself** — one missed day doesn't erase your progress\n\nStart small. The person who shows up every day wins.`;
  }
  if (lower.includes('learn') || lower.includes('study') || lower.includes('remember') || lower.includes('retain')) {
    return `🧠 Evidence-based learning techniques:\n\n1. **Active recall** — test yourself instead of re-reading\n2. **Spaced repetition** — review at increasing intervals\n3. **Teach it** — explaining to others deepens understanding\n4. **Interleave topics** — mix different subjects in one session\n5. **Sleep on it** — your brain consolidates during sleep\n\n📝 After each focus session, spend 5 minutes writing down what you learned.`;
  }
  if (lower.includes('habit') || lower.includes('routine') || lower.includes('daily') || lower.includes('consistent')) {
    return `🎯 Building lasting habits:\n\n1. **Stack habits** — attach new habits to existing ones\n2. **Start tiny** — 1 minute is better than 0 minutes\n3. **Track visually** — your streak counter is a powerful tool\n4. **Design your environment** — make good habits easy, bad ones hard\n5. **Never miss twice** — one skip is fine, two is a pattern\n\n⚡ Every focus session counts toward your chain!`;
  }
  return `Here are some thoughts on "${input.slice(0, 60)}":\n\n• Break this down into smaller, manageable pieces\n• Set a clear goal for what "done" looks like\n• Use your focus timer to dedicate uninterrupted time\n• Track your progress — even small wins compound\n\n💡 Try asking me about focus, motivation, planning, or learning techniques for more specific help.`;
}

// ── API call with retry + timeout ─────────────────────────────────
async function callAI(message, history, retries = 1) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout (accounts for cold start)

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errMsg = data.error || `Server error (${res.status})`;

      // Don't retry config errors — they won't fix themselves
      if (res.status === 400 || res.status === 500) {
        return { ok: false, error: errMsg };
      }

      // Retry transient errors (502, 503, 429)
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1500));
        return callAI(message, history, retries - 1);
      }

      return { ok: false, error: errMsg };
    }

    const data = await res.json();
    return { ok: true, response: data.response };
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === 'AbortError') {
      // Timeout — retry once with a fresh timeout
      if (retries > 0) {
        return callAI(message, history, retries - 1);
      }
      return { ok: false, error: 'Request timed out. The AI might be warming up — please try again.' };
    }

    // Network error — retry once
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return callAI(message, history, retries - 1);
    }

    return { ok: false, error: null }; // Silent fallback
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
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null); // Dedup guard

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Health check — lightweight, no Gemini call (just checks env var on server)
  useEffect(() => {
    fetch('/api/health')
      .then(r => {
        if (!r.ok) throw new Error('Health check failed');
        return r.json();
      })
      .then(data => {
        if (data.ai === 'connected') setApiStatus('online');
        else if (data.ai === 'invalid_key') setApiStatus('invalid_key');
        else if (data.ai === 'model_error') setApiStatus('model_error');
        else setApiStatus('offline');
      })
      .catch(() => setApiStatus('offline'));
  }, []);

  // Rotate loading messages for perceived speed
  useEffect(() => {
    if (!isLoading) return;
    setLoadingMsg(LOADING_MESSAGES[0]);
    let idx = 0;
    const interval = setInterval(() => {
      idx = Math.min(idx + 1, LOADING_MESSAGES.length - 1);
      setLoadingMsg(LOADING_MESSAGES[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSend = useCallback(async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || isLoading) return;

    // Dedup guard: prevent overlapping requests
    if (requestRef.current) return;
    requestRef.current = true;

    setInput('');
    const userMsg = { id: Date.now(), role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const historyForAPI = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const result = await callAI(userMessage, historyForAPI);

    let responseContent;
    let isOffline = false;

    if (result.ok) {
      responseContent = result.response;
      setApiStatus('online');
    } else if (result.error) {
      responseContent = `⚠️ ${result.error}\n\nHere's an offline suggestion instead:\n\n${getOfflineResponse(userMessage)}`;
      isOffline = true;
    } else {
      responseContent = getOfflineResponse(userMessage);
      isOffline = true;
      setApiStatus('offline');
    }

    setMessages(prev => [...prev, {
      id: Date.now() + 1,
      role: 'assistant',
      content: responseContent,
      isOffline,
    }]);
    setIsLoading(false);
    requestRef.current = null;
  }, [input, isLoading, messages]);

  const handleQuickAction = (action) => {
    handleSend(action.prompt);
  };

  const handleCopy = (content, id) => {
    navigator.clipboard.writeText(content).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

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

        {/* Connection status badge */}
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

      {/* Quick Actions (shown when no messages) */}
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
          {/* Clear chat button */}
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
                  {/* Render markdown for assistant, plain text for user */}
                  {msg.role === 'assistant' ? (
                    renderMarkdown(msg.content)
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}

                  {/* Offline indicator */}
                  {msg.role === 'assistant' && msg.isOffline && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
                      <WifiOff size={10} className="text-gray-600" />
                      <span className="text-[10px] text-gray-600">Offline response</span>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="glass-panel px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="text-neon-cyan animate-spin" />
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
