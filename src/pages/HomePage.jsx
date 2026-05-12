import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, Target, ChevronRight, Trophy, Sparkles } from 'lucide-react';
import Pomodoro from '../components/Pomodoro';
import { loadGameState, getLevelInfo, getTodayStats } from '../utils/gamification';
import { useSyllabus } from '../context/SyllabusContext';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Burning midnight oil?';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Night owl mode';
}

function getMotivation(streak, sessions) {
  if (sessions === 0 && streak === 0) return 'Start your first focus session today.';
  if (sessions === 0) return 'Keep your streak alive — start a session.';
  if (streak >= 7) return `${streak}-day streak! You're unstoppable.`;
  if (streak >= 3) return 'Great momentum. Keep it going.';
  return 'Every session counts. Stay focused.';
}

export default function HomePage({ settings, onAlarmStateChange, onOpenSettings }) {
  const [gameState, setGameState] = useState(loadGameState());
  const [todayStats, setTodayStats] = useState(getTodayStats());
  const { subjects, chapters, tasks, toggleTask } = useSyllabus();

  const levelInfo = getLevelInfo(gameState.xp);

  // Refresh game state when focus session completes
  useEffect(() => {
    const handleUpdate = () => {
      setGameState(loadGameState());
      setTodayStats(getTodayStats());
    };

    window.addEventListener('focusSessionComplete', handleUpdate);
    window.addEventListener('focusTimeUpdated', handleUpdate);
    return () => {
      window.removeEventListener('focusSessionComplete', handleUpdate);
      window.removeEventListener('focusTimeUpdated', handleUpdate);
    };
  }, []);

  // Daily goal progress
  const dailyGoalMinutes = (settings?.dailyGoalHours ?? 4) * 60;
  const dailyProgress = Math.min((todayStats.minutes / dailyGoalMinutes) * 100, 100);
  const goalComplete = dailyProgress >= 100;

  // Next up tasks
  const pendingTasks = (tasks ?? []).filter(t => !t.is_completed).slice(0, 3);
  const nextUp = pendingTasks.map(task => {
    const chapter = (chapters ?? []).find(c => c.id === task.chapter_id);
    const subject = chapter ? (subjects ?? []).find(s => s.id === chapter.subject_id) : null;
    return {
      ...task,
      categoryName: subject?.name || 'General',
      categoryColor: subject?.color_code || '#b341f0',
    };
  });

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Greeting */}
      <motion.div
        className="px-1"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {getGreeting()} <span className="text-xl">✦</span>
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {getMotivation(gameState.streak, todayStats.sessions)}
        </p>
      </motion.div>

      {/* Streak + Level Bar */}
      <div className="flex gap-3">
        {/* Streak */}
        <motion.div
          className="flex-1 glass-panel p-3.5 flex items-center gap-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            gameState.streak > 0 ? 'bg-accent-amber/15' : 'bg-white/5'
          }`}>
            <Flame size={20} className={gameState.streak > 0 ? 'text-accent-amber' : 'text-gray-500'} />
          </div>
          <div>
            <div className="text-lg font-bold text-white leading-tight">{gameState.streak}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Day Streak</div>
          </div>
        </motion.div>

        {/* Level */}
        <motion.div
          className="flex-1 glass-panel p-3.5 flex items-center gap-3"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="w-10 h-10 rounded-xl bg-electric-purple/15 flex items-center justify-center">
            <Zap size={20} className="text-electric-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white leading-tight">Lv.{levelInfo.level}</span>
              <span className="text-[10px] text-gray-500 truncate">{levelInfo.title}</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-electric-purple to-neon-cyan rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${levelInfo.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Focus Timer (Hero) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Pomodoro
          durations={settings?.pomodoro ?? { WORK: 25, SHORT_BREAK: 5, LONG_BREAK: 15 }}
          onAlarmStateChange={onAlarmStateChange}
        />
      </motion.div>

      {/* Today's Progress */}
      <motion.div
        className="glass-panel p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-label">Today's Progress</h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Sparkles size={12} className="text-electric-purple" />
            <span>{gameState.xp} XP total</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{(todayStats.minutes / 60).toFixed(1)}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Hours</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{todayStats.sessions}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sessions</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${goalComplete ? 'text-accent-green' : 'text-white'}`}>
              {Math.round(dailyProgress)}%
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Goal</div>
          </div>
        </div>

        {/* Daily goal progress bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">Daily Focus Goal</span>
            <span className="text-xs font-mono text-gray-400">
              {(todayStats.minutes / 60).toFixed(1)} / {(settings?.dailyGoalHours ?? 4).toFixed(1)}h
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: goalComplete
                  ? 'linear-gradient(90deg, #34d399, #00e5ff)'
                  : 'linear-gradient(90deg, #b341f0, #00e5ff)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${dailyProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>

      {/* Next Up — tasks preview */}
      {nextUp.length > 0 && (
        <motion.div
          className="glass-panel p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h3 className="section-label mb-3">Next Up</h3>
          <div className="space-y-2">
            {nextUp.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className="w-5 h-5 rounded border-2 border-white/15 hover:border-neon-cyan/50 transition-colors shrink-0 flex items-center justify-center checkbox-pop"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white/90 truncate block">{task.title}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.categoryColor }} />
                    <span className="text-[10px] text-gray-500 truncate">{task.categoryName}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state when no tasks */}
      {nextUp.length === 0 && (tasks ?? []).length === 0 && (
        <motion.div
          className="glass-panel p-8 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="w-12 h-12 rounded-2xl bg-neon-cyan/10 flex items-center justify-center mb-3">
            <Trophy size={24} className="text-neon-cyan" />
          </div>
          <p className="text-sm text-white/70 font-medium">Start a focus session above</p>
          <p className="text-xs text-gray-500 mt-1">Add tasks in the Tasks tab to track your progress</p>
        </motion.div>
      )}
    </div>
  );
}
