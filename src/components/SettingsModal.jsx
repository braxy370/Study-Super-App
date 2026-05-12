import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, Timer, Target, Database, Info } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSave }) {
  const safeSettings = {
    pomodoro: {
      WORK: settings?.pomodoro?.WORK ?? 25,
      SHORT_BREAK: settings?.pomodoro?.SHORT_BREAK ?? 5,
      LONG_BREAK: settings?.pomodoro?.LONG_BREAK ?? 15,
    },
    dailyGoalHours: settings?.dailyGoalHours ?? 4.0,
  };
  const [localSettings, setLocalSettings] = useState(safeSettings);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setLocalSettings({
      ...safeSettings,
      ...settings,
      pomodoro: { ...safeSettings.pomodoro, ...(settings?.pomodoro ?? {}) }
    });
  }, [settings, isOpen]);

  const handleResetData = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const handleExport = () => {
    const backup = {
      syllabus_subjects: JSON.parse(localStorage.getItem('syllabus_subjects') || '[]'),
      syllabus_chapters: JSON.parse(localStorage.getItem('syllabus_chapters') || '[]'),
      syllabus_tasks: JSON.parse(localStorage.getItem('syllabus_tasks') || '[]'),
      focusflow_game: JSON.parse(localStorage.getItem('focusflow_game') || '{}'),
      superAppSettings: JSON.parse(localStorage.getItem('superAppSettings') || '{}'),
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FocusFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (window.confirm("This will overwrite your current data. Proceed?")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.syllabus_subjects && data.syllabus_chapters && data.syllabus_tasks) {
            localStorage.setItem('syllabus_subjects', JSON.stringify(data.syllabus_subjects));
            localStorage.setItem('syllabus_chapters', JSON.stringify(data.syllabus_chapters));
            localStorage.setItem('syllabus_tasks', JSON.stringify(data.syllabus_tasks));
            if (data.focusflow_game) {
              localStorage.setItem('focusflow_game', JSON.stringify(data.focusflow_game));
            }
            if (data.superAppSettings) {
              localStorage.setItem('superAppSettings', JSON.stringify(data.superAppSettings));
            }
            window.location.reload();
          } else {
            alert('Invalid backup file. Expected FocusFlow backup format.');
          }
        } catch (err) {
          alert('Error reading backup file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const updatePomodoroDuration = (key, value) => {
    const parsed = parseInt(value, 10);
    setLocalSettings(prev => ({
      ...prev,
      pomodoro: {
        ...prev.pomodoro,
        [key]: isNaN(parsed) || parsed < 1 ? 1 : parsed
      }
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-panel w-full max-w-md relative z-10 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-background/50 backdrop-blur-md z-20">
              <h2 className="text-xl font-semibold text-white">Settings</h2>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Timer Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Timer size={14} className="text-neon-cyan" />
                  <h3 className="text-neon-cyan font-medium uppercase text-xs tracking-wider">Timer Durations</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Focus</label>
                    <input 
                      type="number" 
                      min="1"
                      value={localSettings.pomodoro.WORK}
                      onChange={(e) => updatePomodoroDuration('WORK', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-neon-cyan/50 transition-all text-center font-mono"
                    />
                    <span className="block text-[10px] text-gray-600 text-center mt-1">minutes</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Short Break</label>
                    <input 
                      type="number" 
                      min="1"
                      value={localSettings.pomodoro.SHORT_BREAK}
                      onChange={(e) => updatePomodoroDuration('SHORT_BREAK', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-neon-cyan/50 transition-all text-center font-mono"
                    />
                    <span className="block text-[10px] text-gray-600 text-center mt-1">minutes</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">Long Break</label>
                    <input 
                      type="number" 
                      min="1"
                      value={localSettings.pomodoro.LONG_BREAK}
                      onChange={(e) => updatePomodoroDuration('LONG_BREAK', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-neon-cyan/50 transition-all text-center font-mono"
                    />
                    <span className="block text-[10px] text-gray-600 text-center mt-1">minutes</span>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-white/10" />

              {/* Daily Goal */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-electric-purple" />
                  <h3 className="text-electric-purple font-medium uppercase text-xs tracking-wider">Daily Goal</h3>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Focus hours per day</label>
                  <input 
                    type="number" 
                    min="0.5"
                    max="16"
                    step="0.5"
                    value={localSettings.dailyGoalHours ?? 4.0}
                    onChange={(e) => setLocalSettings({...localSettings, dailyGoalHours: parseFloat(e.target.value) || 4.0})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-electric-purple/50 transition-all font-mono"
                  />
                  <p className="text-[10px] text-gray-600 mt-1.5">Recommended: 2–6 hours depending on your schedule</p>
                </div>
              </div>

              <div className="h-px w-full bg-white/10" />

              {/* Data Management */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-gray-400" />
                  <h3 className="text-white/50 font-medium uppercase text-xs tracking-wider">Data</h3>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleExport}
                    className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-neon-cyan/30 text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Export
                  </button>
                  <label className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-electric-purple/30 text-white transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <Upload size={16} />
                    Import
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                  </label>
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-2.5 text-sm font-medium rounded-lg bg-accent-rose/10 border border-accent-rose/30 hover:bg-accent-rose/20 text-accent-rose transition-all flex items-center justify-center gap-2"
                >
                  Reset All Data
                </button>
              </div>

              <div className="h-px w-full bg-white/10" />

              {/* About */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.02]">
                <Info size={14} className="text-gray-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">FocusFlow v1.0</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Gamified productivity. All data stored locally on your device.</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 flex justify-end gap-3 sticky bottom-0 bg-background/50 backdrop-blur-md z-20">
              <button 
                onClick={onClose}
                className="px-4 py-2 min-h-[48px] rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 min-h-[48px] rounded-lg text-sm font-medium bg-gradient-to-r from-neon-cyan to-electric-purple text-white shadow-[0_0_15px_rgba(0,229,255,0.3)] hover:shadow-[0_0_20px_rgba(0,229,255,0.5)] transition-all"
              >
                Save
              </button>
            </div>
          </motion.div>

          <AnimatePresence>
            {showResetConfirm && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                  onClick={() => setShowResetConfirm(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-panel w-full max-w-sm relative z-10 p-6 border border-accent-rose/30"
                >
                  <h3 className="text-xl font-bold text-accent-rose mb-2">Reset everything?</h3>
                  <p className="text-sm text-gray-300 mb-6">
                    This will delete all tasks, categories, focus history, and progress. This cannot be undone.
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResetData}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-accent-rose text-white hover:bg-accent-rose/80 transition-all"
                    >
                      Yes, Reset
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
