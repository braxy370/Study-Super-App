import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2, GripVertical, Plus, Search, X } from 'lucide-react';
import clsx from 'clsx';
import { useSyllabus } from '../context/SyllabusContext';

export default function MasteryChecklist() {
  const { subjects, getChaptersForSubject, getTasksForChapter, getSubjectStats, getChapterStats, toggleTask, deleteTask, addTask } = useSyllabus();
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubjects = useMemo(() => {
    const safeSubjects = subjects ?? [];
    if (!searchQuery.trim()) return safeSubjects;
    return safeSubjects.filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [subjects, searchQuery]);

  if (!subjects || subjects.length === 0) {
    return (
      <div className="glass-panel p-12 flex flex-col items-center justify-center text-center" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,243,255,0.4)]"
        >
          <Plus size={32} className="text-neon-cyan drop-shadow-[0_0_8px_rgba(0,243,255,1)]" />
        </motion.div>
        <p className="text-white font-medium text-lg mb-2">Your journey starts here.</p>
        <p className="text-gray-400 text-sm">Add your first subject to begin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Discovery Bar */}
      <div 
        className="relative flex items-center glass-panel overflow-hidden transition-all duration-300 focus-within:shadow-[0_0_15px_rgba(0,243,255,0.4)] focus-within:border-neon-cyan"
        style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <Search size={18} className="text-gray-400 ml-4 shrink-0" />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search subjects..."
          className="w-full bg-transparent border-none px-3 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-0"
        />
        <AnimatePresence>
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setSearchQuery('')}
              className="mr-3 p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        {filteredSubjects.length === 0 && searchQuery && (
          <div className="glass-panel p-8 text-center" style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
            <p className="text-gray-400">No subjects found matching "{searchQuery}".</p>
          </div>
        )}

        {filteredSubjects.map(subject => {
        const stats = getSubjectStats(subject.id);
        const chapters = getChaptersForSubject(subject.id);
        const isSubjectOpen = expandedSubject === subject.id;
        const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

        return (
          <motion.div key={subject.id} layout className="glass-panel overflow-hidden" style={{ backdropFilter: 'blur(16px)' }}>
            {/* Subject Header */}
            <button
              onClick={() => setExpandedSubject(isSubjectOpen ? null : subject.id)}
              className="w-full p-4 sm:p-5 flex items-center justify-between text-left group transition-colors hover:bg-white/5 min-h-[56px]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: subject.color_code, boxShadow: `0 0 8px ${subject.color_code}` }}
                />
                <span className="text-white font-medium text-base md:text-lg truncate">{subject.name}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: subject.color_code }}
                      initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-mono w-16 text-right">{stats.completed}/{stats.total}</span>
                </div>
                <span className="sm:hidden text-xs text-gray-400 font-mono">{stats.completed}/{stats.total}</span>
                <motion.div animate={{ rotate: isSubjectOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={18} className="text-gray-400" />
                </motion.div>
              </div>
            </button>

            {/* Chapters (Units) Accordion */}
            <AnimatePresence>
              {isSubjectOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 border-t border-white/5 space-y-2 pt-3">
                    {chapters.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">No units yet. Import a syllabus to add them.</p>
                    )}

                    {chapters.map(chapter => {
                      const chStats = getChapterStats(chapter.id);
                      const chTasks = getTasksForChapter(chapter.id);
                      const isChapterOpen = expandedChapter === chapter.id;
                      const chProgress = chStats.total > 0 ? (chStats.completed / chStats.total) * 100 : 0;

                      return (
                        <div key={chapter.id} className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
                          {/* Chapter/Unit Header */}
                          <button
                            onClick={() => setExpandedChapter(isChapterOpen ? null : chapter.id)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors min-h-[48px]"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xs text-electric-purple font-mono font-bold shrink-0">
                                {chapter.is_unit ? '◆' : '○'}
                              </span>
                              <span className="text-sm md:text-base text-white/80 font-medium truncate">{chapter.title}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {/* Mini progress */}
                              <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div className="h-full rounded-full bg-neon-cyan"
                                  initial={{ width: 0 }} animate={{ width: `${chProgress}%` }} transition={{ duration: 0.4 }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-500 font-mono w-8 text-right">{chStats.completed}/{chStats.total}</span>
                              <motion.div animate={{ rotate: isChapterOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
                                <ChevronDown size={14} className="text-gray-500" />
                              </motion.div>
                            </div>
                          </button>

                          {/* Tasks (Sub-topics) */}
                          <AnimatePresence>
                            {isChapterOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-3 border-t border-white/5">
                                  {chTasks.length === 0 && (
                                    <p className="text-gray-600 text-xs py-3 text-center">No sub-topics in this unit.</p>
                                  )}

                                  {chTasks.map((task, idx) => (
                                    <motion.div
                                      key={task.id}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.03 }}
                                      className="flex items-center gap-3 py-2 group/task"
                                    >
                                      <GripVertical size={12} className="text-gray-700 shrink-0" />

                                      {/* Neon Cyan checkbox touch target */}
                                      <label className="relative flex items-center justify-center cursor-pointer shrink-0 w-12 h-12 -ml-2 -my-2">
                                        <input type="checkbox" checked={task.is_completed}
                                          onChange={() => toggleTask(task.id)} className="sr-only peer"
                                        />
                                        <div className={clsx(
                                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300",
                                          task.is_completed
                                            ? "bg-neon-cyan/20 border-neon-cyan shadow-[0_0_6px_rgba(0,243,255,0.5)]"
                                            : "border-white/20 hover:border-white/40"
                                        )}>
                                          {task.is_completed && (
                                            <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }}
                                              className="w-3 h-3 text-neon-cyan" fill="none" viewBox="0 0 24 24"
                                              stroke="currentColor" strokeWidth={3}
                                            ><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></motion.svg>
                                          )}
                                        </div>
                                      </label>

                                      <span className={clsx(
                                        "flex-1 text-sm md:text-base transition-all duration-300 select-none",
                                        task.is_completed ? "line-through text-gray-600" : "text-gray-300"
                                      )}>{task.title}</span>

                                      <button onClick={() => deleteTask(task.id)}
                                        className="text-gray-700 hover:text-red-400 transition-colors sm:opacity-0 sm:group-hover/task:opacity-100 shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                      ><Trash2 size={14} /></button>
                                    </motion.div>
                                  ))}
                                  {/* Add Task Input */}
                                  <form 
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      if (newTaskTitle.trim()) {
                                        addTask(chapter.id, newTaskTitle);
                                        setNewTaskTitle('');
                                      }
                                    }}
                                    className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5"
                                  >
                                    <Plus size={14} className="text-gray-500 shrink-0" />
                                    <input
                                      type="text"
                                      value={expandedChapter === chapter.id ? newTaskTitle : ''}
                                      onChange={(e) => setNewTaskTitle(e.target.value)}
                                      placeholder="Add a sub-topic..."
                                      className="flex-1 bg-transparent text-sm md:text-base text-white placeholder-gray-600 focus:outline-none focus:text-white min-h-[48px]"
                                    />
                                    <button 
                                      type="submit"
                                      className="text-[10px] uppercase font-bold text-neon-cyan opacity-50 hover:opacity-100 focus:opacity-100 transition-opacity"
                                    >
                                      Add
                                    </button>
                                  </form>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
}
