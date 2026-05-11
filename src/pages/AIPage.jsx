import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Lightbulb, BookOpen, Brain, Loader2, ExternalLink, Copy, Check } from 'lucide-react';

const QUICK_ACTIONS = [
  { id: 'explain', label: 'Explain a concept', icon: BookOpen, prompt: 'Explain this concept simply: ' },
  { id: 'quiz', label: 'Quiz me', icon: Brain, prompt: 'Create a quick 5-question quiz about: ' },
  { id: 'plan', label: 'Study plan', icon: Lightbulb, prompt: 'Create a focused study plan for: ' },
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
        <h2 className="text-lg font-bold text-white">AI Study Helper</h2>
        <p className="text-xs text-gray-500 mt-0.5">Ask questions, get explanations, create quizzes</p>
      </motion.div>

      {/* Quick Actions (shown when no messages) */}
      {messages.length === 0 && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {QUICK_ACTIONS.map((action, i) => (
            <motion.button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="glass-panel p-4 flex flex-col items-center gap-2 text-center hover:bg-white/5 transition-all group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-neon-cyan/10 transition-colors">
                <action.icon size={18} className="text-gray-400 group-hover:text-neon-cyan transition-colors" />
              </div>
              <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors">{action.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
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
            className="p-2.5 rounded-xl bg-gradient-to-r from-electric-purple to-neon-cyan text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity hover:shadow-[0_0_15px_rgba(0,243,255,0.3)]"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-600 mt-2">
          AI responses are simulated. Connect an API for real answers.
        </p>
      </div>
    </div>
  );
}

// Simulated responses — replace with real AI API later
function getSimulatedResponse(input) {
  const lower = input.toLowerCase();

  if (lower.includes('quiz') || lower.includes('test')) {
    return `Here's a quick quiz based on your topic:\n\n1. What is the main concept behind this topic?\n2. Can you name 3 key components?\n3. How does this apply in real-world scenarios?\n4. What are common misconceptions?\n5. Explain it as if teaching someone new.\n\n💡 Try answering each question before looking up the answers!`;
  }

  if (lower.includes('study plan') || lower.includes('schedule')) {
    return `📋 Here's a suggested study plan:\n\n**Day 1-2:** Review fundamentals and key concepts\n**Day 3-4:** Practice problems and active recall\n**Day 5:** Teach the material to someone else\n**Day 6:** Take a practice test\n**Day 7:** Review weak areas and rest\n\n🔥 Pair each session with a 25-minute Pomodoro for best results!`;
  }

  if (lower.includes('explain') || lower.includes('what is')) {
    return `Great question! Here's a simplified explanation:\n\nThis topic involves understanding the core principles and how they connect together. Think of it like building blocks — each concept supports the next.\n\n**Key takeaway:** Focus on understanding the "why" behind each concept, not just memorizing facts.\n\n💡 Try explaining this back to yourself in your own words — that's the best test of understanding.`;
  }

  if (lower.includes('motivat') || lower.includes('focus') || lower.includes('procrast')) {
    return `💪 Here are some focus strategies:\n\n1. **Start with just 5 minutes** — momentum builds naturally\n2. **Use the Pomodoro timer** — it's right here in the app!\n3. **Break tasks into tiny steps** — small wins compound\n4. **Remove distractions** — put your phone in another room\n5. **Reward yourself** — celebrate completing each session\n\nRemember: consistency beats intensity. Even 25 minutes today is better than zero.`;
  }

  return `I understand you're asking about: "${input.slice(0, 100)}"\n\nHere are some thoughts:\n\n• Break this down into smaller, manageable pieces\n• Look for connections to things you already know\n• Practice active recall instead of passive reading\n• Use spaced repetition for long-term retention\n\n💡 Would you like me to create a quiz or study plan on this topic?`;
}
