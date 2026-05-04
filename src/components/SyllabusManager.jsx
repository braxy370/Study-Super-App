import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Palette, CheckCircle2, RotateCcw } from 'lucide-react';
import { useSyllabus } from '../context/SyllabusContext';

const PRESET_COLORS = [
  '#00f3ff', // Cyan
  '#bc13fe', // Purple
  '#39ff14', // Lime
  '#ff00ff', // Pink
  '#ffbf00'  // Amber
];

export default function SyllabusManager() {
  const { subjects, addSubject, deleteSubject, bulkAddChapters } = useSyllabus();
  const [newName, setNewName] = useState('');
  const [bulkChapters, setBulkChapters] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[1]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [feedback, setFeedback] = useState('');

  // --- Toast ---
  const [toast, setToast] = useState(null);

  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const result = addSubject(newName, selectedColor);
    if (result) {
      if (bulkChapters.trim()) {
        const chaptersList = bulkChapters.split('\n').filter(c => c.trim().length > 0);
        if (chaptersList.length > 0) {
          bulkAddChapters(result.id, chaptersList);
        }
      }
      setNewName('');
      setBulkChapters('');
      flashFeedback(`"${result.name}" added!`);
    } else {
      flashFeedback('Subject already exists.');
    }
  };

  const handleClearAll = () => {
    setNewName('');
    setBulkChapters('');
  };

  const flashFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* --- Add Subject Form --- */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-panel p-6"
        style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plus size={20} className="text-neon-cyan" />
            Add Subject
          </h3>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
          >
            <RotateCcw size={14} />
            Clear All
          </button>
        </div>

        <form onSubmit={handleAddSubject} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Data Structures"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all"
              />
            </div>

            {/* Color Picker Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center gap-2 h-full"
              >
                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: selectedColor, boxShadow: `0 0 8px ${selectedColor}` }} />
                <Palette size={16} className="text-gray-400" />
              </button>

              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute right-0 top-14 z-50 glass-panel p-3 grid grid-cols-5 gap-2"
                  >
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                      onClick={() => { setSelectedColor(c); setShowColorPicker(false); }}
                        className="w-10 h-10 rounded-full border-2 transition-transform hover:scale-125"
                        style={{
                          backgroundColor: c,
                          borderColor: selectedColor === c ? 'white' : 'transparent',
                          boxShadow: selectedColor === c ? `0 0 10px ${c}` : 'none'
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Power Paste Textarea */}
          <div className="relative">
            <textarea
              value={bulkChapters}
              onChange={(e) => setBulkChapters(e.target.value)}
              placeholder="Paste Unit 1, Unit 2... (Each line becomes a chapter)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition-all resize-y min-h-[200px]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-lg font-medium bg-gradient-to-r from-neon-cyan to-electric-purple text-white shadow-[0_0_15px_rgba(0,243,255,0.3)] hover:shadow-[0_0_20px_rgba(0,243,255,0.5)] transition-all text-sm mt-2"
          >
            Add Subject & Chapters
          </button>
        </form>

        <AnimatePresence>
          {feedback && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-neon-cyan text-sm mt-3 font-medium"
            >
              {feedback}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* --- Subject List --- */}
      <div className="space-y-3">
        <AnimatePresence>
          {subjects.map(subject => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              className="glass-panel p-4 flex items-center justify-between group"
              style={{ backdropFilter: 'blur(16px)', backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: subject.color_code, boxShadow: `0 0 8px ${subject.color_code}` }}
                />
                <span className="text-white font-medium">{subject.name}</span>
              </div>
              <button
                onClick={() => deleteSubject(subject.id)}
                className="text-gray-500 hover:text-red-400 transition-colors sm:opacity-0 sm:group-hover:opacity-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {subjects.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No subjects yet. Add one above or import a syllabus document.</p>
        )}
      </div>



      {/* --- Success Toast --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 30, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] glass-panel px-6 py-3 flex items-center gap-3 shadow-[0_0_25px_rgba(0,243,255,0.2)] border-neon-cyan/30"
            style={{ backdropFilter: 'blur(16px)' }}
          >
            <CheckCircle2 size={20} className="text-neon-cyan shrink-0" />
            <span className="text-white text-sm font-medium">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
