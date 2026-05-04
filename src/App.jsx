import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, BookOpen, LayoutDashboard, Cloud, CloudOff } from 'lucide-react';
import { SyllabusProvider, useSyllabus } from './context/SyllabusContext';
import Clock from './components/Clock';
import CourseMastery from './components/CourseMastery';
import Pomodoro from './components/Pomodoro';
import SettingsModal from './components/SettingsModal';
import SyllabusManager from './components/SyllabusManager';
import MasteryChecklist from './components/MasteryChecklist';
import NextUpFeed from './components/NextUpFeed';
import ExamCountdown from './components/ExamCountdown';
import AuthOverlay from './components/AuthOverlay';
import { supabase } from './supabaseClient';

function AppContent({ session }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncStatus, setSyncStatus] = useState('Synced');
  const [showSyncModal, setShowSyncModal] = useState(false);

  const { autoMasteryValue, refresh } = useSyllabus();
  const syncTimeoutRef = useRef(null);
  const isSavingRef = useRef(false);
  const [offlineToast, setOfflineToast] = useState(false);

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

  const triggerCloudSync = () => {
    if (!session) return;
    setSyncStatus('Saving...');
    isSavingRef.current = true;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    syncTimeoutRef.current = setTimeout(async () => {
      if (!supabase) {
        setSyncStatus('Error (Missing Env)');
        isSavingRef.current = false;
        return;
      }
      try {
        const payload = {
          id: session.user.id,
          study_data: {
            subjects: JSON.parse(localStorage.getItem('syllabus_subjects') || '[]'),
            chapters: JSON.parse(localStorage.getItem('syllabus_chapters') || '[]'),
            tasks: JSON.parse(localStorage.getItem('syllabus_tasks') || '[]')
          },
          settings: JSON.parse(localStorage.getItem('superAppSettings') || '{}'),
          daily_minutes: {
            totalMinutesStudiedToday: localStorage.getItem('totalMinutesStudiedToday'),
            lastStudyDate: localStorage.getItem('lastStudyDate')
          }
        };

        const { error } = await supabase.from('user_data').upsert(payload);
        if (error) throw error;
        setSyncStatus('Synced');
        isSavingRef.current = false;
        setOfflineToast(false);
      } catch (err) {
        console.error("Cloud Sync Error:", err);
        setSyncStatus('Error');
        isSavingRef.current = false;
        setOfflineToast(true);
      }
    }, 2000);
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isSavingRef.current) {
        e.preventDefault();
        e.returnValue = 'Progress is still saving to the cloud. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('superAppSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new Event('settingsUpdated'));
    triggerCloudSync();
  };

  useEffect(() => {
    const handleSyncNeeded = () => triggerCloudSync();
    window.addEventListener('syncNeeded', handleSyncNeeded);
    return () => window.removeEventListener('syncNeeded', handleSyncNeeded);
  }, [session]);

  useEffect(() => {
    if (session) {
      const loadCloudData = async () => {
        if (!supabase) return;
        try {
          const { data, error } = await supabase.from('user_data').select('*').eq('id', session.user.id).single();
          
          if (!data || !data.study_data || (data.study_data.subjects && data.study_data.subjects.length === 0)) {
            const localSubjects = JSON.parse(localStorage.getItem('syllabus_subjects') || '[]');
            if (localSubjects.length > 0) {
              setShowSyncModal(true);
            }
          } else {
            localStorage.setItem('syllabus_subjects', JSON.stringify(data.study_data.subjects || []));
            localStorage.setItem('syllabus_chapters', JSON.stringify(data.study_data.chapters || []));
            localStorage.setItem('syllabus_tasks', JSON.stringify(data.study_data.tasks || []));
            
            if (data.settings && Object.keys(data.settings).length > 0) {
              const merged = {
                ...DEFAULT_SETTINGS,
                ...data.settings,
                pomodoro: { ...DEFAULT_SETTINGS.pomodoro, ...(data.settings?.pomodoro ?? {}) }
              };
              localStorage.setItem('superAppSettings', JSON.stringify(merged));
              setSettings(merged);
            }
            if (data.daily_minutes) {
              localStorage.setItem('totalMinutesStudiedToday', data.daily_minutes.totalMinutesStudiedToday || '0');
              localStorage.setItem('lastStudyDate', data.daily_minutes.lastStudyDate || '');
            }
            refresh();
            window.dispatchEvent(new Event('settingsUpdated'));
          }
        } catch (err) {
          if (err.code === 'PGRST116') {
             const localSubjects = JSON.parse(localStorage.getItem('syllabus_subjects') || '[]');
             if (localSubjects.length > 0) {
               setShowSyncModal(true);
             }
          } else {
             console.error('Error fetching initial cloud data:', err);
          }
        }
      };
      loadCloudData();
    }
  }, [session]);

  const confirmInitialSync = () => {
    setShowSyncModal(false);
    triggerCloudSync();
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
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
          {session && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              {syncStatus === 'Synced' ? <Cloud size={14} className="text-neon-cyan" /> : <CloudOff size={14} className="text-gray-400" />}
              <span className="text-xs font-medium text-gray-300">{syncStatus}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-white mr-2 min-h-[48px] px-2 flex items-center"
            >
              Sign Out
            </button>
          )}
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

      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-[12px]"
              onClick={() => setShowSyncModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-sm relative z-[70] p-6 border border-neon-cyan/50 shadow-[0_0_30px_rgba(0,243,255,0.2)]"
            >
              <h3 className="text-xl font-bold text-neon-cyan mb-2">Local Progress Found!</h3>
              <p className="text-sm text-gray-300 mb-6">
                We found your local progress! Sync it to your new account to access it on mobile?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
                >
                  Skip
                </button>
                <button
                  onClick={confirmInitialSync}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-neon-cyan text-black hover:bg-white transition-all shadow-[0_0_15px_rgba(0,243,255,0.5)] animate-pulse"
                >
                  Sync to Cloud
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {offlineToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-gray-900 border border-red-500/50 text-white px-4 py-3 rounded-xl shadow-lg z-50 flex items-center gap-3"
          >
            <CloudOff className="text-red-400" size={20} />
            <span className="text-sm">Offline: Progress saved locally. Syncing when connection returns.</span>
          </motion.div>
        )}
      </AnimatePresence>

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
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setConfigError(true);
      setLoading(false);
      return;
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin" />
          <p className="text-neon-cyan/70 text-sm font-medium tracking-wider uppercase animate-pulse">Initializing...</p>
        </div>
      </div>
    );
  }

  if (configError && !session) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#09090b] p-4">
        <div className="glass-panel p-8 max-w-md w-full text-center border border-yellow-500/30">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4 border border-yellow-500/30">
            <CloudOff className="text-yellow-500" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Cloud Sync Unavailable</h2>
          <p className="text-sm text-gray-400 mb-4">
            Supabase environment variables are missing. The app will work in offline mode with local storage only.
          </p>
          <button
            onClick={() => setConfigError(false)}
            className="w-full py-3 min-h-[48px] rounded-lg font-bold uppercase tracking-wider bg-gradient-to-r from-neon-cyan to-electric-purple text-white shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all"
          >
            Continue Offline
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SyllabusProvider>
        <AppContent session={session} />
      </SyllabusProvider>
      {!session && supabase && <AuthOverlay />}
    </>
  );
}

export default App;
