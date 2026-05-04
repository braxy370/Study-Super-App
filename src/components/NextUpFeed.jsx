import { motion, AnimatePresence } from 'framer-motion';
import { useSyllabus } from '../context/SyllabusContext';
import { CheckCircle2, Trophy } from 'lucide-react';

export default function NextUpFeed() {
  const { subjects, chapters, tasks, toggleTask } = useSyllabus();

  const pendingTasks = (tasks ?? []).filter(t => !t.is_completed).slice(0, 3);

  // Map to get subject info
  const nextUp = pendingTasks.map(task => {
    const chapter = (chapters ?? []).find(c => c.id === task.chapter_id);
    const subject = chapter ? (subjects ?? []).find(s => s.id === chapter.subject_id) : null;
    return {
      ...task,
      subjectName: subject ? subject.name : 'Unknown',
      subjectColor: subject ? subject.color_code : '#bc13fe'
    };
  });

  return (
    <div className="glass-panel p-6 w-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)' }}>
      <h3 className="text-lg font-semibold text-white mb-4">Next Up</h3>
      
      <AnimatePresence mode="popLayout">
        {nextUp.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-6 text-center"
          >
            <Trophy className="text-neon-cyan mb-3 drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]" size={48} strokeWidth={1.5} />
            <p className="text-white text-sm font-medium">Curriculum Complete. Ready for the Exams!</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {nextUp.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors group"
              >
                <div className="flex flex-col gap-1 overflow-hidden pr-4 flex-1">
                  <span className="text-sm text-white truncate">{task.title}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: task.subjectColor, boxShadow: `0 0 5px ${task.subjectColor}` }} />
                    <span className="text-xs text-gray-500 truncate">{task.subjectName}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleTask(task.id)}
                  className="text-gray-600 hover:text-neon-cyan transition-colors shrink-0 w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-neon-cyan/10"
                >
                  <CheckCircle2 size={24} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
