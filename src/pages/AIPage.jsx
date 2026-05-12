import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Lightbulb, Brain, Loader2, Copy, Check, Timer, ListChecks, Zap, Info } from 'lucide-react';

const QUICK_ACTIONS = [
  { id: 'focus', label: 'Focus tips', icon: Timer, prompt: 'Give me tips to stay focused during a work session' },
  { id: 'plan', label: 'Plan my day', icon: ListChecks, prompt: 'Help me create a productive daily plan for: ' },
  { id: 'motivate', label: 'Motivation', icon: Zap, prompt: 'I need motivation to keep going with my work' },
  { id: 'learn', label: 'Learn better', icon: Brain, prompt: 'What are the best techniques to learn and retain information about: ' },
  { id: 'habit', label: 'Build habits', icon: Lightbulb, prompt: 'Help me build a daily habit of: ' },
];

export default function AIPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage) return;

    setInput('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Simulated AI response (replace with real API later)
    setTimeout(() => {
      const responses = getSimulatedResponse(userMessage);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: responses,
      }]);
      setIsLoading(false);
    }, 800 + Math.random() * 1200);
  };

  const handleQuickAction = (action) => {
    setInput(action.prompt);
    inputRef.current?.focus();
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
      </motion.div>

      {/* Quick Actions (shown when no messages) */}
      {messages.length === 0 && (
        <motion.div
          className="flex flex-col gap-2.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Info banner */}
          <div className="glass-panel p-3 flex items-start gap-2.5">
            <Info size={14} className="text-neon-cyan shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Responses are generated locally for now. Connect an AI API in settings for real-time answers.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {QUICK_ACTIONS.map((action, i) => (
              <motion.button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className="glass-panel p-3.5 flex flex-col items-center gap-2 text-center hover:bg-white/5 transition-all group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
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
              className="text-[10px] uppercase tracking-wider font-semibold text-gray-600 hover:text-gray-400 transition-colors px-2 py-1"
            >
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
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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
                <span className="text-sm text-gray-400">Thinking...</span>
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

// Simulated responses — replace with real AI API later
function getSimulatedResponse(input) {
  const lower = input.toLowerCase();

  if (lower.includes('focus') || lower.includes('concentrat') || lower.includes('distract')) {
    return `Here are some proven focus techniques:\n\n1. **Start with just 5 minutes** — momentum builds naturally\n2. **Use the Pomodoro timer** — it's right here in the app!\n3. **Single-task** — close all other tabs and apps\n4. **Time-block** — assign specific tasks to specific hours\n5. **Environment matters** — find a quiet, dedicated workspace\n\n💡 Try starting a 25-minute focus session now. You'll be surprised how much you get done.`;
  }

  if (lower.includes('plan') || lower.includes('schedule') || lower.includes('organize')) {
    return `📋 Here's a productive daily framework:\n\n**Morning (High Energy)**\n• Tackle your hardest, most important task\n• Do deep work requiring concentration\n\n**Afternoon (Moderate Energy)**\n• Handle meetings, communication, and lighter tasks\n• Review progress on ongoing projects\n\n**Evening (Wind Down)**\n• Plan tomorrow's priorities\n• Reflect on what you accomplished\n\n🔥 Pair each block with a Pomodoro session for best results!`;
  }

  if (lower.includes('motivat') || lower.includes('procrast') || lower.includes('stuck') || lower.includes('lazy')) {
    return `💪 Here's what actually works against procrastination:\n\n1. **The 2-Minute Rule** — if it takes less than 2 minutes, do it now\n2. **Break it down** — large tasks feel overwhelming. Split into tiny steps.\n3. **Reward yourself** — complete a session, then take a proper break\n4. **Track your streak** — consistency beats intensity every time\n5. **Forgive yourself** — one missed day doesn't erase your progress\n\nRemember: the person who shows up every day beats the person who shows up perfectly once. Start small.`;
  }

  if (lower.includes('learn') || lower.includes('study') || lower.includes('remember') || lower.includes('retain')) {
    return `🧠 Evidence-based learning techniques:\n\n1. **Active recall** — test yourself instead of re-reading\n2. **Spaced repetition** — review at increasing intervals\n3. **Teach it** — explaining to others deepens understanding\n4. **Interleave topics** — mix different subjects in one session\n5. **Sleep on it** — your brain consolidates during sleep\n\n📝 After each focus session, spend 5 minutes writing down what you learned in your own words.`;
  }

  if (lower.includes('habit') || lower.includes('routine') || lower.includes('daily') || lower.includes('consistent')) {
    return `🎯 Building lasting habits:\n\n1. **Stack habits** — attach new habits to existing ones\n2. **Start tiny** — 1 minute is better than 0 minutes\n3. **Track visually** — your streak counter is a powerful tool\n4. **Design your environment** — make good habits easy, bad ones hard\n5. **Never miss twice** — one skip is fine, two is a pattern\n\n⚡ The FocusFlow streak system is designed exactly for this. Every session counts toward your chain!`;
  }

  return `Great question about: "${input.slice(0, 80)}"\n\nHere are some thoughts:\n\n• Break this down into smaller, manageable pieces\n• Set a clear goal for what "done" looks like\n• Use your focus timer to dedicate uninterrupted time\n• Track your progress — even small wins compound\n\n💡 Would you like me to help create a plan or give specific tips? Try asking about focus, motivation, or learning techniques.`;
}
