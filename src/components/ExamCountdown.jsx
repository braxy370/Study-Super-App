import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export default function ExamCountdown({ onOpenSettings }) {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, reached: false });
  const [endDate, setEndDate] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(0);
  const [isAnimatingFill, setIsAnimatingFill] = useState(false);

  const [dailyGoalHours, setDailyGoalHours] = useState(4.0);
  const [showPrecision, setShowPrecision] = useState(true);

  const getExamCountdown = (targetDate) => {
    if (!targetDate) return { days: 0, hours: 0, minutes: 0, reached: false };
    const now = new Date();
    
    const safeTargetDate = targetDate.includes('T') ? targetDate : `${targetDate}T00:00:00`;
    const target = new Date(safeTargetDate);
    
    if (isNaN(target.getTime())) return { days: 0, hours: 0, minutes: 0, reached: false };
    
    const delta = target.getTime() - now.getTime();
    if (delta < 0) return { days: 0, hours: 0, minutes: 0, reached: true };

    const days = Math.floor(delta / (1000 * 60 * 60 * 24));
    const hours = Math.floor((delta / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((delta / 1000 / 60) % 60);

    return { days, hours, minutes };
  };

  const loadSettingsAndCalculate = () => {
    const saved = localStorage.getItem('superAppSettings');
    let target = '';
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.end) target = parsed.end;
        if (parsed.dailyGoalHours !== undefined) setDailyGoalHours(parsed.dailyGoalHours);
        if (parsed.showPrecisionCountdown !== undefined) setShowPrecision(parsed.showPrecisionCountdown);
      } catch (e) {}
    }
    setEndDate(target);
    setCountdown(getExamCountdown(target));
  };

  const loadFocusTime = () => {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('lastStudyDate');
    
    if (lastDate !== today) {
      localStorage.setItem('lastStudyDate', today);
      localStorage.setItem('totalMinutesStudiedToday', '0');
      setDailyMinutes(0);
    } else {
      setDailyMinutes(Number(localStorage.getItem('totalMinutesStudiedToday')) || 0);
    }
  };

  useEffect(() => {
    loadSettingsAndCalculate();
    loadFocusTime();

    const interval = setInterval(() => {
      loadSettingsAndCalculate();
    }, 60000); // every 60 seconds

    const handleFocusUpdate = (e) => {
      loadFocusTime();
      setIsAnimatingFill(true);
      setTimeout(() => setIsAnimatingFill(false), 1000);
    };

    const handleStorageChange = () => {
      loadSettingsAndCalculate();
    };

    window.addEventListener('focusTimeUpdated', handleFocusUpdate);
    window.addEventListener('storage', handleStorageChange); // To catch settings update if implemented that way
    
    // Also we might need a custom event for settings update if not using storage event across tabs
    window.addEventListener('settingsUpdated', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focusTimeUpdated', handleFocusUpdate);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsUpdated', handleStorageChange);
    };
  }, []);

  const isUrgent = !countdown.reached && countdown.days < 7;
  const isReached = !!countdown.reached;
  const colorClass = isReached ? 'text-green-400' : (isUrgent ? 'text-red-500' : 'text-neon-cyan');
  const shadowClass = isReached ? 'drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]' : (isUrgent ? 'drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]');
  const glowBorderClass = isReached ? 'border-green-400/30 shadow-[0_0_20px_rgba(74,222,128,0.15)]' : (isUrgent ? 'border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'border-neon-cyan/30 shadow-[0_0_20px_rgba(0,243,255,0.15)]');

  const hoursDisplay = (dailyMinutes / 60).toFixed(2);
  const progressPercent = Math.min((dailyMinutes / (dailyGoalHours * 60)) * 100, 100);

  return (
    <div className={clsx(
      "relative p-6 sm:p-8 rounded-2xl transition-all duration-500",
      "bg-white/[0.05] backdrop-blur-[16px] border",
      glowBorderClass
    )}>
      {/* Settings Icon */}
      <button 
        onClick={onOpenSettings}
        className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors group min-w-[48px] min-h-[48px] flex items-center justify-center"
      >
        <Calendar className="text-gray-400 group-hover:text-neon-cyan drop-shadow-[0_0_8px_rgba(0,243,255,0)] group-hover:drop-shadow-[0_0_8px_rgba(0,243,255,0.8)] transition-all" size={20} />
      </button>

      {/* Countdown Section */}
      <div className="mb-8">
        <h2 className="text-xs sm:text-sm font-semibold text-white/50 uppercase tracking-[0.2em] mb-2">Final Countdown</h2>
        <div className="flex items-baseline gap-2">
          {countdown.reached ? (
            <span className={clsx("text-2xl sm:text-4xl font-bold tracking-tighter transition-colors duration-500", colorClass, shadowClass)}>
              Goal Reached!
            </span>
          ) : (
            <>
              <span className={clsx("text-2xl sm:text-7xl font-bold font-mono tracking-tighter transition-colors duration-500", colorClass, shadowClass)}>
                {countdown.days}
              </span>
              <span className={clsx("text-lg sm:text-xl font-medium transition-colors duration-500", colorClass)}>
                Days Left
              </span>
            </>
          )}
        </div>
        {showPrecision && !isReached && (
          <div className="flex gap-4 mt-2 text-sm text-gray-400 font-mono">
            <span>{(countdown.hours || 0).toString().padStart(2, '0')}h</span>
            <span>{(countdown.minutes || 0).toString().padStart(2, '0')}m</span>
          </div>
        )}
      </div>

      {/* Today's Grind Section */}
      <div>
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-xs sm:text-sm font-semibold text-white/50 uppercase tracking-[0.2em]">Today's Grind</h2>
          <span className="text-sm font-mono text-electric-purple font-bold drop-shadow-[0_0_8px_rgba(188,19,254,0.6)]">
            {hoursDisplay} / {dailyGoalHours.toFixed(1)} Hours
          </span>
        </div>
        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative mb-2">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-electric-purple to-neon-cyan"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ boxShadow: '0 0 15px rgba(0,243,255,0.6)' }}
          />
          {isAnimatingFill && (
             <motion.div 
               className="absolute top-0 left-0 h-full bg-white"
               initial={{ width: 0, opacity: 0.8 }}
               animate={{ width: `${progressPercent}%`, opacity: 0 }}
               transition={{ duration: 0.8 }}
             />
          )}
        </div>
      </div>
    </div>
  );
}
