import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as db from '../db/syllabusDB';

const SyllabusContext = createContext(null);

export function SyllabusProvider({ children }) {
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [autoMasteryValue, setAutoMasteryValue] = useState(0);
  const [globalMetrics, setGlobalMetrics] = useState({
    totalSubjects: 0,
    totalChapters: 0,
    totalTasks: 0,
    completedTasks: 0,
    masteryPercentage: 0
  });

  const refresh = useCallback(() => {
    setSubjects(db.getAllSubjects());
    setChapters(db.getAllChapters());
    setTasks(db.getAllTasks());
    setAutoMasteryValue(db.getGlobalCompletionPercentage());
    setGlobalMetrics(db.getGlobalMetrics());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // --- Subject ops ---
  const addSubject = useCallback((name, colorCode) => {
    const result = db.addSubject(name, colorCode);
    if (result) refresh();
    return result;
  }, [refresh]);

  const deleteSubject = useCallback((id) => {
    db.deleteSubject(id);
    refresh();
  }, [refresh]);

  // --- Chapter ops ---
  const addChapter = useCallback((subjectId, title, isUnit = true) => {
    const result = db.addChapter(subjectId, title, isUnit);
    if (result) refresh();
    return result;
  }, [refresh]);

  const deleteChapter = useCallback((chapterId) => {
    db.deleteChapter(chapterId);
    refresh();
  }, [refresh]);

  const bulkAddChapters = useCallback((subjectId, titlesArray) => {
    const result = db.bulkAddChapters(subjectId, titlesArray);
    refresh();
    return result;
  }, [refresh]);

  // --- Task ops ---
  const addTask = useCallback((chapterId, title) => {
    const result = db.addTask(chapterId, title);
    if (result) refresh();
    return result;
  }, [refresh]);

  const toggleTask = useCallback((taskId) => {
    db.toggleTaskComplete(taskId);
    refresh();
  }, [refresh]);

  const deleteTask = useCallback((taskId) => {
    db.deleteTask(taskId);
    refresh();
  }, [refresh]);

  // --- Hierarchical batch import ---
  const batchImportHierarchy = useCallback((subjectId, units) => {
    db.batchImportHierarchy(subjectId, units);
    refresh();
  }, [refresh]);

  // --- Derived data ---
  const getChaptersForSubject = useCallback((subjectId) => {
    return chapters.filter(c => c.subject_id === subjectId).sort((a, b) => a.order_index - b.order_index);
  }, [chapters]);

  const getTasksForChapter = useCallback((chapterId) => {
    return tasks.filter(t => t.chapter_id === chapterId).sort((a, b) => a.order_index - b.order_index);
  }, [tasks]);

  const getSubjectStats = useCallback((subjectId) => {
    return db.getSubjectCompletionStats(subjectId);
  }, [tasks]);

  const getChapterStats = useCallback((chapterId) => {
    return db.getChapterCompletionStats(chapterId);
  }, [tasks]);

  return (
    <SyllabusContext.Provider value={{
      subjects, chapters, tasks, autoMasteryValue, globalMetrics,
      addSubject, deleteSubject,
      addChapter, deleteChapter, bulkAddChapters,
      addTask, toggleTask, deleteTask,
      batchImportHierarchy,
      getChaptersForSubject, getTasksForChapter,
      getSubjectStats, getChapterStats,
      refresh,
    }}>
      {children}
    </SyllabusContext.Provider>
  );
}

export const useSyllabus = () => {
  const ctx = useContext(SyllabusContext);
  if (!ctx) throw new Error('useSyllabus must be used within SyllabusProvider');
  return ctx;
};
