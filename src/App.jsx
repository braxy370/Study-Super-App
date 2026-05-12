import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CheckSquare, BarChart3, Sparkles, Settings } from 'lucide-react';
import { SyllabusProvider } from './context/SyllabusContext';

import HomePage from './pages/HomePage';
import TasksPage from './pages/TasksPage';
import StatsPage from './pages/StatsPage';
import AIPage from './pages/AIPage';
import SettingsModal from './components/SettingsModal';

import { checkStreakStatus } from './utils/gamification';

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);

  const DEFAULT_SETTINGS = {
    pomodoro: {
      WORK: 25,
      SHORT_BREAK: 5,
      LONG_BREAK: 15
    },
    dailyGoalHours: 4.0,
  };

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('superAppSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          pomodoro: { ...DEFAULT_SETTINGS.pomodoro, ...(parsed?.pomodoro ?? {}) }
        };
      } catch (e) { /* fallback */ }
    }
    return DEFAULT_SETTINGS;
  });

  // Check streak on load
  useEffect(() => {
    checkStreakStatus();
  }, []);

  const handleSaveSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('superAppSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new Event('settingsUpdated'));
  }, []);

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'ai', label: 'AI', icon: Sparkles },
  ];

  const pageVariants = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  };

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-between items-center px-4 md:px-8 pt-4 pb-2 z-20 relative">
        <h1 className="text-xl md:text-2xl font-bold gradient-text tracking-tight">
          FocusFlow
        </h1>
        <button
          id="settings-btn"
          onClick={() => setIsSettingsOpen(true)}
          className="p-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 md:px-8">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div key="home" {...pageVariants} transition={{ duration: 0.2 }}>
                <HomePage
                  settings={settings}
                  onAlarmStateChange={setIsAlarmRinging}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </motion.div>
            )}
            {activeTab === 'tasks' && (
              <motion.div key="tasks" {...pageVariants} transition={{ duration: 0.2 }}>
                <TasksPage />
              </motion.div>
            )}
            {activeTab === 'stats' && (
              <motion.div key="stats" {...pageVariants} transition={{ duration: 0.2 }}>
                <StatsPage settings={settings} />
              </motion.div>
            )}
            {activeTab === 'ai' && (
              <motion.div key="ai" {...pageVariants} transition={{ duration: 0.2 }}>
                <AIPage />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom" id="bottom-nav">
        <div className="bg-surface/80 backdrop-blur-xl border-t border-white/8">
          <div className="max-w-3xl mx-auto flex items-stretch">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-all duration-200 relative ${
                    isActive ? 'text-neon-cyan' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  aria-label={tab.label}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-neon-cyan rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Background ambient glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className={`absolute top-[-15%] left-[-15%] w-[50%] h-[50%] rounded-full blur-[140px] transition-colors duration-1000 ${isAlarmRinging ? 'bg-red-500/15' : 'bg-neon-cyan/8'}`} />
        <div className={`absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] rounded-full blur-[140px] transition-colors duration-1000 ${isAlarmRinging ? 'bg-red-500/15' : 'bg-electric-purple/8'}`} />
        {isAlarmRinging && (
          <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" style={{ animationDuration: '1s' }} />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <SyllabusProvider>
      <AppContent />
    </SyllabusProvider>
  );
}

export default App;
