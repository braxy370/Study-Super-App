import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, BookOpen, LayoutDashboard } from 'lucide-react';
import { SyllabusProvider, useSyllabus } from './context/SyllabusContext';
import Clock from './components/Clock';
import CourseMastery from './components/CourseMastery';
import Pomodoro from './components/Pomodoro';
import SettingsModal from './components/SettingsModal';
import SyllabusManager from './components/SyllabusManager';
import MasteryChecklist from './components/MasteryChecklist';
import NextUpFeed from './components/NextUpFeed';
import ExamCountdown from './components/ExamCountdown';

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const defaultStart = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString().split('T')[0];

  const DEFAULT_SETTINGS = {
    start: defaultStart,
    end: defaultEnd,
    progressMode: 'Auto',
    manualProgressValue: 0,
    pomodoro: {
      WORK: 25,
      SHORT_BREAK: 5,
      LONG_BREAK: 15
    },
    dailyGoalHours: 4.0,
    showPrecisionCountdown: true
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
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_SETTINGS;
  });

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('superAppSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new Event('settingsUpdated'));
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'syllabus', label: 'Syllabus', icon: BookOpen },
  ];

  return (
    <div className="min-h-[100dvh] p-4 md:p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-6 relative overflow-x-hidden">
      <header className="flex justify-between items-center w-full z-10 relative">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-electric-purple">
            Study Super App
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 min-w-[48px] min-h-[48px] rounded-full bg-glass-bg border border-glass-border hover:bg-white/10 transition-colors text-gray-300 hover:text-white flex items-center justify-center"
          >
            <Settings size={24} />
          </button>
        </div>
      </header>

      <nav className="flex gap-2 z-10 relative">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 min-h-[48px] rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(0,243,255,0.15)]'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.main
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col md:flex-row gap-8 z-10 relative flex-grow w-full"
          >
            <div className="md:w-7/12 lg:w-7/12 flex flex-col gap-8 order-2 md:order-1">
              <ExamCountdown onOpenSettings={() => setIsSettingsOpen(true)} />
              <Clock />
              <CourseMastery
                progressMode={settings.progressMode || 'Auto'}
                manualProgressValue={settings.manualProgressValue || 0}
              />
              <NextUpFeed />
            </div>

            <div className="md:w-5/12 lg:w-5/12 order-1 md:order-2">
              <Pomodoro
                durations={settings?.pomodoro ?? { WORK: 25, SHORT_BREAK: 5, LONG_BREAK: 15 }}
                onAlarmStateChange={setIsAlarmRinging}
              />
            </div>
          </motion.main>
        )}

        {activeTab === 'syllabus' && (
          <motion.main
            key="syllabus"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col md:flex-row gap-8 z-10 relative flex-grow w-full"
          >
            <div className="md:w-1/2 w-full">
              <SyllabusManager />
            </div>

            <div className="md:w-1/2 w-full">
              <h2 className="text-xs font-semibold text-white/70 mb-4 uppercase tracking-wider">Mastery Checklist</h2>
              <MasteryChecklist />
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 ${isAlarmRinging ? 'bg-red-500/20' : 'bg-neon-cyan/10'}`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 ${isAlarmRinging ? 'bg-red-500/20' : 'bg-electric-purple/10'}`} />

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
