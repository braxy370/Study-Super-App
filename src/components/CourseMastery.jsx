import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import confetti from 'canvas-confetti';
import { useSyllabus } from '../context/SyllabusContext';

export default function CourseMastery({ progressMode, manualProgressValue }) {
  const { globalMetrics, subjects, getSubjectStats } = useSyllabus();
  const isManual = progressMode === 'Manual';
  const percentage = isManual ? (manualProgressValue ?? 0) : (globalMetrics?.masteryPercentage ?? 0);
  const isComplete = percentage >= 100 && percentage > 0;
  
  const [pulse, setPulse] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(0);

  // Haptic pulse when a sub-topic is marked "Done"
  useEffect(() => {
    if (!isManual) {
      const completed = globalMetrics?.completedTasks ?? 0;
      if (completed > prevCompleted) {
        setPulse(true);
        const timer = setTimeout(() => setPulse(false), 500);
        setPrevCompleted(completed);
        return () => clearTimeout(timer);
      } else if (completed < prevCompleted) {
        setPrevCompleted(completed);
      }
    }
  }, [globalMetrics?.completedTasks, isManual, prevCompleted]);

  // Victory Celebration
  useEffect(() => {
    if (isComplete && !hasCelebrated && !isManual && (globalMetrics?.totalTasks ?? 0) > 0) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#00f3ff', '#bc13fe']
      });
      setHasCelebrated(true);
    }
  }, [isComplete, hasCelebrated, isManual, globalMetrics?.totalTasks]);

  const circleRadius = 70;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (percentage / 100) * circleCircumference;

  const getHealthColor = (percentage) => {
    if (percentage <= 30) return '#e63946';
    if (percentage <= 70) return '#f5a623';
    return '#2ecc71';
  };

  // Subject breakdown for the legend
  const subjectBreakdown = (subjects ?? []).map(subject => {
    const stats = getSubjectStats(subject.id);
    const perc = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    return {
      id: subject.id,
      name: subject.name,
      color: subject.color_code || '#00f3ff',
      percentage: perc
    };
  });

  const getInitials = (name) => {
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <div className={clsx(
      "glass-panel p-6 w-full relative overflow-visible transition-all duration-700 flex flex-col gap-6",
      pulse && "shadow-[0_0_30px_rgba(188,19,254,0.4)]"
    )} style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)' }}>
      
      <div className="flex flex-col sm:flex-row items-center gap-8 w-full">
        {/* Text Info */}
        <div className="flex-1 text-center sm:text-left w-full">
          <h3 className="text-xl font-semibold text-white/90">Global Mastery</h3>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            {isManual ? 'Manual Progress Tracking' : 'Based on atomic sub-topic tracking.'}
          </p>
          
          {!isManual && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Subjects Enrolled:</span>
                <span className="text-white font-bold">{globalMetrics.totalSubjects}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Units Overview:</span>
                <span className="text-white font-bold">{globalMetrics.totalChapters} Units</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Topics Mastered:</span>
                <span className="text-electric-purple font-bold">
                  {globalMetrics.completedTasks} / {globalMetrics.totalTasks}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* SVG Circular Progress Chart */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
            <defs>
              <linearGradient id="masteryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f3ff" />
                <stop offset="100%" stopColor="#bc13fe" />
              </linearGradient>
              <filter id="drop-shadow">
                 <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#bc13fe" floodOpacity="0.6"/>
              </filter>
            </defs>
            
            {/* Background Track */}
            <circle
              cx="90" cy="90" r={circleRadius}
              fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12"
            />
            
            {/* Progress Path */}
            <motion.circle
              cx="90" cy="90" r={circleRadius}
              fill="none" 
              stroke="url(#masteryGradient)" 
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circleCircumference}
              initial={{ strokeDashoffset: circleCircumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              filter="url(#drop-shadow)"
            />
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <motion.div
              className={clsx(
                "text-3xl font-bold text-white transition-all duration-300",
                isComplete && "animate-pulse drop-shadow-[0_0_15px_rgba(188,19,254,0.8)]"
              )}
              key={pulse ? 'pulsing' : 'normal'}
              initial={pulse ? { scale: 1.3, textShadow: "0 0 20px #00f3ff" } : { scale: 1, opacity: 1 }}
              animate={{ scale: 1, opacity: 1, textShadow: "0 0 0px transparent" }}
              transition={{ duration: pulse ? 0.5 : 0.4 }}
            >
              {Number(percentage).toFixed(1)}<span className="text-xl text-gray-400">%</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Subject Breakdown Legend */}
      {!isManual && subjectBreakdown.length > 0 && (
        <div className="w-full flex gap-3 pt-4 border-t border-white/5 flex-wrap overflow-visible pb-2">
          {subjectBreakdown.map(sub => (
            <div 
              key={sub.id}
              className="flex-1 min-w-[100px] relative group flex items-center gap-2 min-h-[44px]"
            >
              <span className="text-[11px] font-bold uppercase shrink-0 transition-colors duration-700" style={{ color: sub.color, textShadow: `0 0 8px ${sub.color}80` }}>
                {getInitials(sub.name)}
              </span>
              <div className="h-[6px] w-full bg-white/5 rounded-full relative">
                <div 
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${sub.percentage}%`,
                    backgroundColor: sub.color,
                    boxShadow: sub.percentage > 0 ? `0 0 12px 2px ${sub.color}` : 'none'
                  }}
                />
              </div>
              {/* Tooltip */}
              <div 
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                style={{ 
                  backgroundColor: '#1a1a1a', 
                  color: '#ffffff',
                  border: `1px solid ${sub.color}`,
                  boxShadow: `0 4px 15px rgba(0, 0, 0, 0.5), 0 0 10px ${sub.color}40`,
                  backdropFilter: 'blur(8px)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  zIndex: 9999,
                  pointerEvents: 'none',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                {sub.name}: {sub.percentage.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
