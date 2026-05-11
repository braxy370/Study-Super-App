import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, BellOff } from 'lucide-react';
import clsx from 'clsx';
import { playClick, startAlarmLoop, stopAlarmLoop } from '../utils/audio';
import { completeFocusSession } from '../utils/gamification';

export default function Pomodoro({ durations: rawDurations, onAlarmStateChange }) {
  const durations = {
    WORK: rawDurations?.WORK ?? 25,
    SHORT_BREAK: rawDurations?.SHORT_BREAK ?? 5,
    LONG_BREAK: rawDurations?.LONG_BREAK ?? 15,
  };

  const [mode, setMode] = useState('WORK');
  
  const getModes = (durs) => ({
    WORK: { label: 'Focus', minutes: durs?.WORK ?? 25, color: 'neon-cyan', hex: '#00f3ff' },
    SHORT_BREAK: { label: 'Short Break', minutes: durs?.SHORT_BREAK ?? 5, color: 'electric-purple', hex: '#bc13fe' },
    LONG_BREAK: { label: 'Long Break', minutes: durs?.LONG_BREAK ?? 15, color: 'electric-purple', hex: '#bc13fe' }
  });

  const MODES = getModes(durations);

  const [timeLeft, setTimeLeft] = useState(MODES.WORK.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [targetTime, setTargetTime] = useState(null);
  const [isIdle, setIsIdle] = useState(true);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [currentRounds, setCurrentRounds] = useState(0);
  const [showReward, setShowReward] = useState(false);

  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef(null);

  // The "Instant-Response" Audio Engine
  const audioRef = useRef(null);
  
  if (!audioRef.current && typeof Audio !== 'undefined') {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.4;
      audioRef.current.load();
    }
  }, []);

  // Notify App.jsx of alarm state
  useEffect(() => {
    if (onAlarmStateChange) {
      onAlarmStateChange(isAlarmRinging);
    }
  }, [isAlarmRinging, onAlarmStateChange]);

  // When durations change from settings, reset timer instantly
  useEffect(() => {
    setTimeLeft(MODES[mode].minutes * 60);
    setIsActive(false);
    setTargetTime(null);
    setIsIdle(true);
    dismissAlarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durations.WORK, durations.SHORT_BREAK, durations.LONG_BREAK]);

  // Load from local storage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('pomodoroState');
    if (savedState) {
      try {
        const { savedMode, savedTimeLeft, savedIsActive, savedTargetTime, savedRounds } = JSON.parse(savedState);
        setMode(savedMode || 'WORK');
        setCurrentRounds(savedRounds || 0);
        setIsIdle(false);
        
        if (savedIsActive && savedTargetTime) {
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((savedTargetTime - now) / 1000));
          setTimeLeft(remaining);
          if (remaining > 0) {
            setTargetTime(savedTargetTime);
            setIsActive(true);
          } else {
            setIsActive(false);
          }
        } else if (savedTimeLeft !== undefined) {
          setTimeLeft(savedTimeLeft);
        }
      } catch (e) {
        console.error("Failed to parse pomodoro state", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    if (isIdle) return; 
    const state = {
      savedMode: mode,
      savedTimeLeft: timeLeft,
      savedIsActive: isActive,
      savedRounds: currentRounds,
      savedTargetTime: targetTime
    };
    localStorage.setItem('pomodoroState', JSON.stringify(state));
  }, [mode, timeLeft, isActive, isIdle, currentRounds, targetTime]);

  const tick = useCallback(() => {
    if (!isActive || !targetTime) return;
    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((targetTime - now) / 1000));
    setTimeLeft(remaining);
    
    if (remaining === 0) {
      setIsActive(false);
      setTargetTime(null);
      setIsAlarmRinging(true);
      startAlarmLoop();
      
      if (mode === 'WORK') {
        const newRounds = currentRounds + 1;
        setCurrentRounds(newRounds);
        if (newRounds % 4 === 0 && newRounds > 0) {
          setShowReward(true);
          setTimeout(() => setShowReward(false), 3000);
        }

        // Update gamification engine
        completeFocusSession(durations.WORK);
        window.dispatchEvent(new CustomEvent('focusSessionComplete'));
        window.dispatchEvent(new CustomEvent('focusTimeUpdated'));
      }
    }
  }, [isActive, targetTime, mode, currentRounds, durations.WORK]);

  useEffect(() => {
    let interval = null;
    if (isActive && targetTime) {
      interval = setInterval(tick, 500);
    }
    return () => clearInterval(interval);
  }, [isActive, targetTime, tick]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [tick]);


  const dismissAlarm = () => {
    setIsAlarmRinging(false);
    stopAlarmLoop();
  };

  const toggleTimer = () => {
    playClick();
    if (isAlarmRinging) dismissAlarm();
    
    if (!isActive) {
      setTargetTime(Date.now() + timeLeft * 1000);
      setIsActive(true);
    } else {
      setIsActive(false);
      setTargetTime(null);
    }
    setIsIdle(false);
  };

  const resetTimer = () => {
    playClick();
    dismissAlarm();
    setIsActive(false);
    setTargetTime(null);
    setTimeLeft(MODES[mode].minutes * 60);
  };

  const resetRounds = () => {
    setCurrentRounds(0);
  };

  const changeMode = (newMode) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    dismissAlarm();
    setMode(newMode);
    setIsActive(false);
    setTargetTime(null);
    setTimeLeft(MODES[newMode].minutes * 60);
    setIsIdle(false);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentModeConfig = MODES[mode];
  const totalSeconds = currentModeConfig.minutes * 60;
  const progress = totalSeconds > 0 ? 1 - timeLeft / totalSeconds : 0;

  // Determine glow class
  const glowClass = clsx(
    'glass-panel p-6 w-full flex flex-col items-center relative overflow-hidden transition-all duration-700',
    isActive && mode === 'WORK' && 'shadow-[0_0_30px_rgba(0,243,255,0.2)]',
    isActive && mode !== 'WORK' && 'shadow-[0_0_30px_rgba(188,19,254,0.2)]',
    isAlarmRinging && 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
  );

  return (
    <div className={glowClass}>
      <div className="flex gap-2 sm:gap-4 mb-6 z-10 w-full justify-center">
        {Object.entries(MODES).map(([key, config]) => (
          <button
            key={key}
            onClick={() => changeMode(key)}
            className={clsx(
              'px-3 sm:px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium transition-all duration-300 backdrop-blur-md',
              mode === key 
                ? 'bg-white/20 text-white border border-white/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
            )}
            style={mode === key ? { boxShadow: `0 0 10px ${config.hex}` } : {}}
          >
            {config.label}
          </button>
        ))}
      </div>

      <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center z-10 mb-8">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="48%"
            className="stroke-white/10 fill-none"
            strokeWidth="4"
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r="48%"
            className={clsx('fill-none', mode === 'WORK' ? 'stroke-neon-cyan' : 'stroke-electric-purple', isAlarmRinging && 'stroke-red-500')}
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ strokeDasharray: "0 1000" }}
            animate={{ strokeDasharray: `${progress * 2 * Math.PI * 48}% 1000` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={isFocused && !isActive ? inputValue : formatTime(timeLeft)}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={(e) => {
            if (isActive) {
              e.target.blur();
              return;
            }
            setIsFocused(true);
            setInputValue(formatTime(timeLeft));
            setTimeout(() => {
              inputRef.current?.select();
            }, 10);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            const val = e.target.value.trim();
            if (!val) return;
            let newSeconds = timeLeft;
            if (val.includes(':')) {
              const parts = val.split(':');
              const m = parseInt(parts[0], 10) || 0;
              const s = parseInt(parts[1], 10) || 0;
              newSeconds = m * 60 + s;
            } else {
              const parsed = parseInt(val, 10) || 0;
              newSeconds = parsed * 60;
            }
            setTimeLeft(newSeconds);
            setIsIdle(false);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
          readOnly={isActive}
          className={clsx(
            "w-full text-center bg-transparent outline-none",
            "text-5xl sm:text-6xl font-mono font-bold tracking-tighter drop-shadow-lg transition-colors cursor-pointer",
            isAlarmRinging ? "text-red-500" : "text-white"
          )}
        />
      </div>

      <div className="flex items-center gap-4 mb-8 z-10">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(round => {
            const visualRound = currentRounds % 4 === 0 && currentRounds > 0 ? 4 : currentRounds % 4;
            return (
              <div
                key={round}
                className={clsx(
                  "w-3 h-3 rounded-full transition-all duration-500",
                  round <= visualRound
                    ? "bg-neon-cyan shadow-[0_0_10px_#00f3ff]"
                    : "bg-white/10"
                )}
              />
            );
          })}
        </div>
        <button
          onClick={resetRounds}
          className="text-[10px] uppercase font-bold text-gray-500 hover:text-white transition-colors"
        >
          Reset Rounds
        </button>
      </div>

      <div className="flex gap-6 z-10">
        {!isAlarmRinging ? (
          <>
            <button
              onClick={toggleTimer}
              className={clsx(
                'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 shadow-lg',
                mode === 'WORK' ? 'bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30' : 'bg-electric-purple/20 text-electric-purple hover:bg-electric-purple/30'
              )}
            >
              {isActive ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
            
            <button
              onClick={resetTimer}
              className="w-12 h-12 rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
            >
              <RotateCcw size={24} />
            </button>
          </>
        ) : (
          <button
            onClick={dismissAlarm}
            className="px-6 py-4 min-h-[48px] rounded-full flex items-center justify-center gap-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-all duration-300 transform hover:scale-105 shadow-[0_0_15px_rgba(239,68,68,0.4)] font-bold tracking-wider"
          >
            <BellOff size={24} />
            DISMISS ALARM
          </button>
        )}
      </div>

      {isActive && !isAlarmRinging && (
        <motion.div
          className={clsx(
            'absolute inset-0 opacity-20 pointer-events-none',
            mode === 'WORK' ? 'bg-neon-cyan' : 'bg-electric-purple'
          )}
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Reward Pulse */}
      {showReward && (
        <motion.div
          className="absolute inset-0 z-50 pointer-events-none bg-neon-cyan/20 mix-blend-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1, repeat: 3 }}
        />
      )}
    </div>
  );
}
