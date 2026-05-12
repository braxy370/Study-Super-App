import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, Clock, TrendingUp, Award, CalendarDays, Target } from 'lucide-react';
import { loadGameState, getLevelInfo, getRecentHistory } from '../utils/gamification';
import { useSyllabus } from '../context/SyllabusContext';

export default function StatsPage({ settings }) {
  const [gameState, setGameState] = useState(loadGameState());
  const { globalMetrics, subjects, getSubjectStats } = useSyllabus();
  const levelInfo = getLevelInfo(gameState.xp);

  useEffect(() => {
    const handleUpdate = () => setGameState(loadGameState());
    window.addEventListener('focusSessionComplete', handleUpdate);
    return () => window.removeEventListener('focusSessionComplete', handleUpdate);
  }, []);

  const weekHistory = getRecentHistory(7);
  const maxMinutes = Math.max(...weekHistory.map(h => h.minutes), 1);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    return (subjects ?? []).map(subject => {
      const stats = getSubjectStats(subject.id);
      const perc = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
      return { id: subject.id, name: subject.name, color: subject.color_code || '#00e5ff', percentage: perc, completed: stats.completed, total: stats.total };
    });
  }, [subjects, getSubjectStats]);

  const totalHours = (gameState.totalMinutes / 60).toFixed(1);
  const avgSessionMin = gameState.totalSessions > 0 ? Math.round(gameState.totalMinutes / gameState.totalSessions) : 0;

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Level Card */}
      <motion.div
        className="glass-panel p-5 relative overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-electric-purple/20 to-neon-cyan/20 flex items-center justify-center border border-white/10">
            <span className="text-2xl font-bold gradient-text">{levelInfo.level}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{levelInfo.title}</h3>
            <p className="text-xs text-gray-500">
              {levelInfo.xp} XP total · {levelInfo.xpForNextLevel - levelInfo.xpInLevel} XP to next level
            </p>
          </div>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-electric-purple to-neon-cyan rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${levelInfo.progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-600 font-mono">Lv.{levelInfo.level}</span>
          <span className="text-[10px] text-gray-600 font-mono">Lv.{levelInfo.level + 1}</span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Flame, label: 'Current Streak', value: `${gameState.streak}d`, color: 'text-accent-amber', bg: 'bg-accent-amber/10' },
          { icon: Award, label: 'Best Streak', value: `${gameState.longestStreak}d`, color: 'text-neon-cyan', bg: 'bg-neon-cyan/10' },
          { icon: Clock, label: 'Total Hours', value: totalHours, color: 'text-electric-purple', bg: 'bg-electric-purple/10' },
          { icon: TrendingUp, label: 'Sessions', value: gameState.totalSessions, color: 'text-accent-green', bg: 'bg-accent-green/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="glass-panel p-3.5 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 + i * 0.05 }}
          >
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className="text-lg font-bold text-white">{stat.value}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Weekly Focus Chart */}
      <motion.div
        className="glass-panel p-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-label">This Week</h3>
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Focus Time</span>
          </div>
        </div>

        <div className="flex items-end gap-2 h-28">
          {weekHistory.map((day, i) => {
            const height = maxMinutes > 0 ? Math.max((day.minutes / maxMinutes) * 100, day.minutes > 0 ? 8 : 3) : 3;
            const isToday = i === weekHistory.length - 1;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] text-gray-600 font-mono">
                  {day.minutes > 0 ? `${Math.round(day.minutes)}m` : ''}
                </span>
                <motion.div
                  className={`w-full rounded-md ${
                    isToday
                      ? 'bg-gradient-to-t from-electric-purple to-neon-cyan'
                      : day.minutes > 0
                        ? 'bg-white/15'
                        : 'bg-white/5'
                  }`}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                />
                <span className={`text-[10px] font-medium ${isToday ? 'text-neon-cyan' : 'text-gray-500'}`}>
                  {day.day}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Avg Session + Daily Goal */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          className="glass-panel p-4 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center mx-auto mb-2">
            <Target size={16} className="text-neon-cyan" />
          </div>
          <div className="text-lg font-bold text-white">{avgSessionMin}m</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Session</div>
        </motion.div>
        <motion.div
          className="glass-panel p-4 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-8 h-8 rounded-lg bg-electric-purple/10 flex items-center justify-center mx-auto mb-2">
            <Zap size={16} className="text-electric-purple" />
          </div>
          <div className="text-lg font-bold text-white">{(settings?.dailyGoalHours ?? 4).toFixed(1)}h</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Daily Goal</div>
        </motion.div>
      </div>

      {/* Task Completion Overview */}
      {globalMetrics && globalMetrics.totalTasks > 0 && (
        <motion.div
          className="glass-panel p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-label">Task Progress</h3>
            <span className="text-sm font-bold gradient-text">
              {globalMetrics.masteryPercentage.toFixed(1)}%
            </span>
          </div>

          {/* Overall progress */}
          <div className="mb-4">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-neon-cyan to-electric-purple rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${globalMetrics.masteryPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-600">{globalMetrics.completedTasks} done</span>
              <span className="text-[10px] text-gray-600">{globalMetrics.totalTasks} total</span>
            </div>
          </div>

          {/* Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="space-y-2.5 pt-3 border-t border-white/5">
              {categoryBreakdown.map(sub => (
                <div key={sub.id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                  <span className="text-xs text-gray-400 flex-1 truncate">{sub.name}</span>
                  <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: sub.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${sub.percentage}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono w-10 text-right">{sub.completed}/{sub.total}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {(!globalMetrics || globalMetrics.totalTasks === 0) && gameState.totalSessions === 0 && (
        <motion.div
          className="glass-panel p-10 flex flex-col items-center text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-14 h-14 rounded-2xl bg-electric-purple/10 flex items-center justify-center mb-3">
            <TrendingUp size={28} className="text-electric-purple" />
          </div>
          <p className="text-sm text-white/80 font-medium">No stats yet</p>
          <p className="text-xs text-gray-500 mt-1">Complete your first focus session to start tracking progress</p>
        </motion.div>
      )}
    </div>
  );
}
