import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, CheckCircle2, Search, X, BookOpen, ListTodo } from 'lucide-react';
import clsx from 'clsx';
import { useSyllabus } from '../context/SyllabusContext';

export default function TasksPage() {
  const {
    subjects, chapters, tasks,
    getChaptersForSubject, getTasksForChapter,
    getSubjectStats, getChapterStats,
    toggleTask, deleteTask, addTask,
    addSubject, deleteSubject, bulkAddChapters,
  } = useSyllabus();

  const [viewMode, setViewMode] = useState('tasks'); // 'tasks' or 'syllabus'
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick add state
  const [quickTaskText, setQuickTaskText] = useState('');

  // Syllabus add state
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [bulkChapterText, setBulkChapterText] = useState('');
  const PRESET_COLORS = ['#00f3ff', '#bc13fe', '#39ff14', '#ff00ff', '#ffbf00'];
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  // All pending tasks (flat list for quick view)
  const allPendingTasks = useMemo(() => {
    return (tasks ?? []).filter(t => !t.is_completed).map(task => {
      const chapter = (chapters ?? []).find(c => c.id === task.chapter_id);
      const subject = chapter ? (subjects ?? []).find(s => s.id === chapter.subject_id) : null;
      return {
        ...task,
        subjectName: subject?.name || 'General',
        subjectColor: subject?.color_code || '#bc13fe',
        chapterTitle: chapter?.title || '',
      };
    });
  }, [tasks, chapters, subjects]);

  const completedTasks = useMemo(() => {
    return (tasks ?? []).filter(t => t.is_completed).length;
  }, [tasks]);

  const filteredSubjects = useMemo(() => {
    const safeSubjects = subjects ?? [];
    if (!searchQuery.trim()) return safeSubjects;
    return safeSubjects.filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [subjects, searchQuery]);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quickTaskText.trim()) return;
    // Add to first available chapter, or prompt to create
    if (chapters && chapters.length > 0) {
      addTask(chapters[0].id, quickTaskText.trim());
      setQuickTaskText('');
    }
  };

  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const result = addSubject(newSubjectName, selectedColor);
    if (result) {
      if (bulkChapterText.trim()) {
        const chaptersList = bulkChapterText.split('\n').filter(c => c.trim().length > 0);
        if (chaptersList.length > 0) {
          bulkAddChapters(result.id, chaptersList);
        }
      }
      setNewSubjectName('');
      setBulkChapterText('');
      setShowAddSubject(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* View Toggle */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
        <button
          onClick={() => setViewMode('tasks')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
            viewMode === 'tasks'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
          )}
        >
          <ListTodo size={16} />
          Tasks
        </button>
        <button
          onClick={() => setViewMode('syllabus')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
            viewMode === 'syllabus'
              ? 'bg-white/10 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-300'
          )}
        >
          <BookOpen size={16} />
          Syllabus
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'tasks' ? (
          <motion.div
            key="tasks-view"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-4"
          >
            {/* Stats bar */}
            <div className="flex gap-3">
              <div className="flex-1 glass-panel p-3 text-center">
                <div className="text-lg font-bold text-white">{allPendingTasks.length}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Pending</div>
              </div>
              <div className="flex-1 glass-panel p-3 text-center">
                <div className="text-lg font-bold text-accent-green">{completedTasks}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Done</div>
              </div>
              <div className="flex-1 glass-panel p-3 text-center">
                <div className="text-lg font-bold text-electric-purple">{(subjects ?? []).length}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Subjects</div>
              </div>
            </div>

            {/* Quick add */}
            {chapters && chapters.length > 0 && (
              <form onSubmit={handleQuickAdd} className="glass-panel flex items-center overflow-hidden">
                <Plus size={16} className="text-gray-500 ml-4 shrink-0" />
                <input
                  type="text"
                  value={quickTaskText}
                  onChange={(e) => setQuickTaskText(e.target.value)}
                  placeholder="Quick add a task..."
                  className="flex-1 bg-transparent px-3 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
                {quickTaskText && (
                  <button type="submit" className="text-xs font-semibold text-neon-cyan px-4 hover:text-white transition-colors">
                    Add
                  </button>
                )}
              </form>
            )}

            {/* Pending tasks list */}
            {allPendingTasks.length > 0 ? (
              <div className="glass-panel divide-y divide-white/5 overflow-hidden">
                {allPendingTasks.map((task, i) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors group"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="w-5 h-5 rounded border-2 border-white/15 hover:border-neon-cyan/50 transition-all shrink-0 flex items-center justify-center hover:bg-neon-cyan/10"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-white/90 block truncate">{task.title}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: task.subjectColor }} />
                        <span className="text-[10px] text-gray-500 truncate">{task.subjectName}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-gray-700 hover:text-accent-rose transition-colors shrink-0 p-2 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-panel p-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent-green/10 flex items-center justify-center mb-3">
                  <CheckCircle2 size={28} className="text-accent-green" />
                </div>
                <p className="text-sm text-white/80 font-medium">All caught up!</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(subjects ?? []).length === 0
                    ? 'Switch to Syllabus view to add subjects and tasks'
                    : 'No pending tasks. Great work!'}
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="syllabus-view"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-4"
          >
            {/* Search */}
            <div className="glass-panel flex items-center overflow-hidden focus-within:border-neon-cyan/30 transition-all">
              <Search size={16} className="text-gray-500 ml-4 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subjects..."
                className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mr-3 p-1 text-gray-400 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Add Subject button */}
            <button
              onClick={() => setShowAddSubject(!showAddSubject)}
              className="glass-panel p-3.5 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                <Plus size={16} className="text-neon-cyan" />
              </div>
              <span className="text-sm font-medium text-white/70">Add Subject</span>
            </button>

            {/* Add Subject Form */}
            <AnimatePresence>
              {showAddSubject && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleAddSubject} className="glass-panel p-4 flex flex-col gap-3">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="Subject name"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan/50 transition-all"
                      />
                      <div className="flex gap-1.5 items-center">
                        {PRESET_COLORS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setSelectedColor(c)}
                            className={clsx(
                              'w-6 h-6 rounded-full transition-transform',
                              selectedColor === c ? 'scale-125 ring-2 ring-white/30' : 'hover:scale-110'
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <textarea
                      value={bulkChapterText}
                      onChange={(e) => setBulkChapterText(e.target.value)}
                      placeholder="Paste chapters/units (one per line)..."
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan/50 transition-all resize-y min-h-[100px]"
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-neon-cyan to-electric-purple text-white transition-all hover:shadow-[0_0_20px_rgba(0,243,255,0.3)]"
                    >
                      Add Subject
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subject list */}
            <div className="space-y-3">
              {filteredSubjects.length === 0 && searchQuery && (
                <div className="glass-panel p-8 text-center">
                  <p className="text-sm text-gray-400">No subjects matching "{searchQuery}"</p>
                </div>
              )}

              {filteredSubjects.length === 0 && !searchQuery && (
                <div className="glass-panel p-10 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-electric-purple/10 flex items-center justify-center mb-3">
                    <BookOpen size={28} className="text-electric-purple" />
                  </div>
                  <p className="text-sm text-white/80 font-medium">No subjects yet</p>
                  <p className="text-xs text-gray-500 mt-1">Tap "Add Subject" above to get started</p>
                </div>
              )}

              {filteredSubjects.map(subject => {
                const stats = getSubjectStats(subject.id);
                const subjectChapters = getChaptersForSubject(subject.id);
                const isOpen = expandedSubject === subject.id;
                const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

                return (
                  <div key={subject.id} className="glass-panel overflow-hidden">
                    {/* Subject Header */}
                    <button
                      onClick={() => setExpandedSubject(isOpen ? null : subject.id)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/3 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: subject.color_code, boxShadow: `0 0 8px ${subject.color_code}40` }}
                        />
                        <span className="text-sm font-medium text-white truncate">{subject.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: subject.color_code }} />
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">{stats.completed}/{stats.total}</span>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronDown size={16} className="text-gray-500" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Chapters */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 border-t border-white/5 pt-2 space-y-1.5">
                            {subjectChapters.length === 0 && (
                              <p className="text-gray-600 text-xs text-center py-3">No chapters yet</p>
                            )}

                            {subjectChapters.map(chapter => {
                              const chStats = getChapterStats(chapter.id);
                              const chTasks = getTasksForChapter(chapter.id);
                              const isChOpen = expandedChapter === chapter.id;

                              return (
                                <div key={chapter.id} className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
                                  <button
                                    onClick={() => setExpandedChapter(isChOpen ? null : chapter.id)}
                                    className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/3 transition-colors"
                                  >
                                    <span className="text-sm text-white/70 truncate flex-1">{chapter.title}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[10px] text-gray-600 font-mono">{chStats.completed}/{chStats.total}</span>
                                      <motion.div animate={{ rotate: isChOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
                                        <ChevronDown size={14} className="text-gray-600" />
                                      </motion.div>
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {isChOpen && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="px-3 pb-2 border-t border-white/5">
                                          {chTasks.length === 0 && (
                                            <p className="text-gray-600 text-[11px] py-2 text-center">No tasks in this chapter</p>
                                          )}

                                          {chTasks.map(task => (
                                            <div key={task.id} className="flex items-center gap-2.5 py-2 group/task">
                                              <label className="flex items-center justify-center cursor-pointer shrink-0 w-10 h-10 -ml-1 -my-1">
                                                <input
                                                  type="checkbox"
                                                  checked={task.is_completed}
                                                  onChange={() => toggleTask(task.id)}
                                                  className="sr-only peer"
                                                />
                                                <div className={clsx(
                                                  "w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200",
                                                  task.is_completed
                                                    ? "bg-neon-cyan/20 border-neon-cyan"
                                                    : "border-white/15 hover:border-white/30"
                                                )}>
                                                  {task.is_completed && (
                                                    <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                      className="w-2.5 h-2.5 text-neon-cyan" fill="none" viewBox="0 0 24 24"
                                                      stroke="currentColor" strokeWidth={3}
                                                    ><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></motion.svg>
                                                  )}
                                                </div>
                                              </label>
                                              <span className={clsx(
                                                "flex-1 text-sm transition-all",
                                                task.is_completed ? "line-through text-gray-600" : "text-gray-300"
                                              )}>{task.title}</span>
                                              <button
                                                onClick={() => deleteTask(task.id)}
                                                className="text-gray-700 hover:text-accent-rose transition-colors shrink-0 p-1.5 rounded opacity-0 group-hover/task:opacity-100"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                          ))}

                                          {/* Add task to chapter */}
                                          <form
                                            onSubmit={(e) => {
                                              e.preventDefault();
                                              if (newTaskTitle.trim()) {
                                                addTask(chapter.id, newTaskTitle);
                                                setNewTaskTitle('');
                                              }
                                            }}
                                            className="flex items-center gap-2 mt-1 pt-1.5 border-t border-white/5"
                                          >
                                            <Plus size={12} className="text-gray-600 shrink-0" />
                                            <input
                                              type="text"
                                              value={expandedChapter === chapter.id ? newTaskTitle : ''}
                                              onChange={(e) => setNewTaskTitle(e.target.value)}
                                              placeholder="Add task..."
                                              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none py-2"
                                            />
                                          </form>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}

                            {/* Delete subject */}
                            <button
                              onClick={() => deleteSubject(subject.id)}
                              className="w-full mt-2 py-2 text-xs text-gray-600 hover:text-accent-rose transition-colors flex items-center justify-center gap-1.5"
                            >
                              <Trash2 size={12} />
                              Delete Subject
                            </button>
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
    </div>
  );
}
