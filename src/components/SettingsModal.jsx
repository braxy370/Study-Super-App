import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSave }) {
  const safeSettings = {
    start: settings?.start ?? '',
    end: settings?.end ?? '',
    progressMode: settings?.progressMode ?? 'Auto',
    manualProgressValue: settings?.manualProgressValue ?? 0,
    pomodoro: {
      WORK: settings?.pomodoro?.WORK ?? 25,
      SHORT_BREAK: settings?.pomodoro?.SHORT_BREAK ?? 5,
      LONG_BREAK: settings?.pomodoro?.LONG_BREAK ?? 15,
    },
    dailyGoalHours: settings?.dailyGoalHours ?? 4.0,
    showPrecisionCountdown: settings?.showPrecisionCountdown ?? true,
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
      superAppSettings: JSON.parse(localStorage.getItem('superAppSettings') || '{}')
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyApp_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (window.confirm("This will overwrite your current progress. Proceed?")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.syllabus_subjects && data.syllabus_chapters && data.syllabus_tasks) {
            localStorage.setItem('syllabus_subjects', JSON.stringify(data.syllabus_subjects));
            localStorage.setItem('syllabus_chapters', JSON.stringify(data.syllabus_chapters));
            localStorage.setItem('syllabus_tasks', JSON.stringify(data.syllabus_tasks));
            if (data.superAppSettings) {
              localStorage.setItem('superAppSettings', JSON.stringify(data.superAppSettings));
            }
            window.location.reload();
          } else {
            alert('Invalid backup file structure.');
          }
        } catch (err) {
          alert('Error parsing JSON backup file.');
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
              {/* Mastery Progress Settings */}
              <div className="space-y-4">
                <h3 className="text-neon-cyan font-medium uppercase text-xs tracking-wider">Progress Logic</h3>
                
                <div className="flex items-center gap-4 bg-white/5 p-2 rounded-lg border border-white/10">
                  <button
                    onClick={() => setLocalSettings({...localSettings, progressMode: 'Auto'})}
                    className={`flex-1 py-2 min-h-[48px] text-sm font-medium rounded-md transition-all ${
                      localSettings.progressMode !== 'Manual' 
                        ? 'bg-neon-cyan/20 text-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.4)] border border-neon-cyan/30' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Auto (Syllabus)
                  </button>
                  <button
                    onClick={() => setLocalSettings({...localSettings, progressMode: 'Manual'})}
                    className={`flex-1 py-2 min-h-[48px] text-sm font-medium rounded-md transition-all ${
                      localSettings.progressMode === 'Manual' 
                        ? 'bg-neon-cyan/20 text-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.4)] border border-neon-cyan/30' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Manual (Slider)
                  </button>
                </div>

                <AnimatePresence>
                  {localSettings.progressMode === 'Manual' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-300">Mastery Level</label>
                          <span className="text-electric-purple font-bold drop-shadow-[0_0_5px_#bc13fe]">
                            {localSettings.manualProgressValue || 0}%
                          </span>
                        </div>
                        <div className="relative flex items-center h-6">
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="1"
                            value={localSettings.manualProgressValue || 0}
                            onChange={(e) => setLocalSettings({...localSettings, manualProgressValue: Number(e.target.value)})}
                            className="w-full h-2 appearance-none bg-white/10 rounded-full outline-none focus:ring-2 focus:ring-electric-purple/50 accent-electric-purple shadow-[0_0_10px_rgba(188,19,254,0.3)] hover:shadow-[0_0_15px_rgba(188,19,254,0.6)] transition-all cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-electric-purple [&::-webkit-slider-thumb]:shadow-[0_0_15px_#bc13fe]"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-px w-full bg-white/10" />

              {/* Semester Settings (Legacy/Retained) */}
              <div className="space-y-4">
                <h3 className="text-white/50 font-medium uppercase text-xs tracking-wider">Semester Dates</h3>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      value={localSettings.start}
                      onChange={(e) => setLocalSettings({...localSettings, start: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-400 mb-1">End Date</label>
                    <input 
                      type="date" 
                      value={localSettings.end}
                      onChange={(e) => setLocalSettings({...localSettings, end: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-white/10" />

              {/* Timer Settings */}
              <div className="space-y-4">
                <h3 className="text-electric-purple font-medium uppercase text-xs tracking-wider">Timer Durations (Minutes)</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Focus</label>
                    <input 
                      type="number" 
                      min="1"
                      value={localSettings.pomodoro.WORK}
                      onChange={(e) => updatePomodoroDuration('WORK', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-electric-purple focus:ring-1 focus:ring-electric-purple transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Short Break</label>
                    <input 
                      type="number" 
                      min="1"
                      value={localSettings.pomodoro.SHORT_BREAK}
                      onChange={(e) => updatePomodoroDuration('SHORT_BREAK', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-electric-purple focus:ring-1 focus:ring-electric-purple transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Long Break</label>
                    <input 
                      type="number" 
                      min="1"
                      value={localSettings.pomodoro.LONG_BREAK}
                      onChange={(e) => updatePomodoroDuration('LONG_BREAK', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-electric-purple focus:ring-1 focus:ring-electric-purple transition-all"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-gray-300 mb-1">Daily Focus Goal (Hours)</label>
                  <input 
                    type="number" 
                    min="0.1"
                    step="0.1"
                    value={localSettings.dailyGoalHours ?? 4.0}
                    onChange={(e) => setLocalSettings({...localSettings, dailyGoalHours: parseFloat(e.target.value) || 4.0})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-h-[48px] text-white focus:outline-none focus:border-electric-purple focus:ring-1 focus:ring-electric-purple transition-all"
                  />
                </div>
              </div>

              <div className="h-px w-full bg-white/10" />
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10">
                  <div>
                    <h3 className="text-neon-cyan font-medium text-sm">Show High-Precision Countdown</h3>
                    <p className="text-xs text-gray-400">Display hours and minutes on the dashboard</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={localSettings.showPrecisionCountdown ?? true}
                      onChange={(e) => setLocalSettings({...localSettings, showPrecisionCountdown: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-cyan"></div>
                  </label>
                </div>
              </div>

              <div className="h-px w-full bg-white/10" />

              {/* Data Management */}
              <div className="space-y-4">
                <h3 className="text-neon-cyan font-medium uppercase text-xs tracking-wider">Data Management</h3>
                <div className="flex gap-4">
                  <button
                    onClick={handleExport}
                    className="flex-1 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-neon-cyan text-white transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Export JSON
                  </button>
                  <label className="flex-1 py-2 text-sm font-medium rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-electric-purple text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                    <Upload size={16} />
                    Import JSON
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                  </label>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-2 text-sm font-medium rounded-lg bg-red-500/10 border border-red-500/50 hover:bg-red-500/20 text-red-500 transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2"
                  >
                    Reset All App Data
                  </button>
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
                className="px-4 py-2 min-h-[48px] rounded-lg text-sm font-medium bg-gradient-to-r from-neon-cyan to-electric-purple text-white shadow-[0_0_15px_rgba(0,243,255,0.4)] hover:shadow-[0_0_20px_rgba(0,243,255,0.6)] transition-all"
              >
                Save Changes
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
                  className="glass-panel w-full max-w-sm relative z-10 p-6 border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                >
                  <h3 className="text-xl font-bold text-red-500 mb-2">Are you sure?</h3>
                  <p className="text-sm text-gray-300 mb-6">
                    This will delete all subjects, tasks, and study progress. This action cannot be undone.
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
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    >
                      Yes, Reset Everything
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
