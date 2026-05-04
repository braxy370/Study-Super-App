// ============================================
// Syllabus Data Layer v2 — Hierarchical
// subjects → chapters (units) → tasks (sub-topics)
// ============================================

const SUBJECTS_KEY = 'syllabus_subjects';
const CHAPTERS_KEY = 'syllabus_chapters';
const TASKS_KEY    = 'syllabus_tasks';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const load = (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
const save = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('syncNeeded'));
  }
};

// ============================================
// SUBJECTS  { id, name, color_code }
// ============================================
export const getAllSubjects = () => load(SUBJECTS_KEY);

export const addSubject = (name, colorCode = '#bc13fe') => {
  const subjects = load(SUBJECTS_KEY);
  if (subjects.find(s => s.name.toLowerCase() === name.trim().toLowerCase())) return null;
  const subject = { id: generateId(), name: name.trim(), color_code: colorCode };
  subjects.push(subject);
  save(SUBJECTS_KEY, subjects);
  return subject;
};

export const deleteSubject = (id) => {
  save(SUBJECTS_KEY, load(SUBJECTS_KEY).filter(s => s.id !== id));
  // CASCADE: delete chapters and their tasks
  const chapters = load(CHAPTERS_KEY);
  const chapterIds = chapters.filter(c => c.subject_id === id).map(c => c.id);
  save(CHAPTERS_KEY, chapters.filter(c => c.subject_id !== id));
  save(TASKS_KEY, load(TASKS_KEY).filter(t => !chapterIds.includes(t.chapter_id)));
};

export const updateSubject = (id, updates) => {
  const subjects = load(SUBJECTS_KEY);
  const idx = subjects.findIndex(s => s.id === id);
  if (idx === -1) return null;
  subjects[idx] = { ...subjects[idx], ...updates };
  save(SUBJECTS_KEY, subjects);
  return subjects[idx];
};

// ============================================
// CHAPTERS (Units)  { id, subject_id, title, is_unit, order_index }
// ============================================
export const getAllChapters = () => load(CHAPTERS_KEY);

export const getChaptersBySubject = (subjectId) =>
  load(CHAPTERS_KEY).filter(c => c.subject_id === subjectId).sort((a, b) => a.order_index - b.order_index);

export const addChapter = (subjectId, title, isUnit = true) => {
  const chapters = load(CHAPTERS_KEY);
  const chapter = {
    id: generateId(),
    subject_id: subjectId,
    title: title.trim(),
    is_unit: isUnit,
    order_index: chapters.filter(c => c.subject_id === subjectId).length,
  };
  chapters.push(chapter);
  save(CHAPTERS_KEY, chapters);
  return chapter;
};

export const deleteChapter = (chapterId) => {
  save(CHAPTERS_KEY, load(CHAPTERS_KEY).filter(c => c.id !== chapterId));
  // CASCADE: delete tasks under this chapter
  save(TASKS_KEY, load(TASKS_KEY).filter(t => t.chapter_id !== chapterId));
};

// Legacy compat: bulk add chapters (flat mode)
export const bulkAddChapters = (subjectId, titlesArray) => {
  const chapters = load(CHAPTERS_KEY);
  const existingCount = chapters.filter(c => c.subject_id === subjectId).length;
  const newChapters = titlesArray
    .map(raw => raw.replace(/^\s*\d+[\.\)\-\:\s]*/g, '').trim())
    .filter(t => t.length > 0)
    .map((title, i) => ({
      id: generateId(),
      subject_id: subjectId,
      title,
      is_unit: false,
      order_index: existingCount + i,
    }));
  chapters.push(...newChapters);
  save(CHAPTERS_KEY, chapters);
  return newChapters;
};

// ============================================
// TASKS (Sub-topics)  { id, chapter_id, title, is_completed, order_index }
// ============================================
export const getAllTasks = () => load(TASKS_KEY);

export const getTasksByChapter = (chapterId) =>
  load(TASKS_KEY).filter(t => t.chapter_id === chapterId).sort((a, b) => a.order_index - b.order_index);

export const addTask = (chapterId, title) => {
  const tasks = load(TASKS_KEY);
  const task = {
    id: generateId(),
    chapter_id: chapterId,
    title: title.trim(),
    is_completed: false,
    order_index: tasks.filter(t => t.chapter_id === chapterId).length,
  };
  tasks.push(task);
  save(TASKS_KEY, tasks);
  return task;
};

export const bulkAddTasks = (chapterId, titlesArray) => {
  const tasks = load(TASKS_KEY);
  const existingCount = tasks.filter(t => t.chapter_id === chapterId).length;
  const newTasks = titlesArray.filter(t => t.trim()).map((title, i) => ({
    id: generateId(),
    chapter_id: chapterId,
    title: title.trim(),
    is_completed: false,
    order_index: existingCount + i,
  }));
  tasks.push(...newTasks);
  save(TASKS_KEY, tasks);
  return newTasks;
};

export const toggleTaskComplete = (taskId) => {
  const tasks = load(TASKS_KEY);
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return null;
  tasks[idx].is_completed = !tasks[idx].is_completed;
  save(TASKS_KEY, tasks);
  return tasks[idx];
};

export const deleteTask = (taskId) => {
  save(TASKS_KEY, load(TASKS_KEY).filter(t => t.id !== taskId));
};

// ============================================
// MASTERY ENGINE — based on TASKS
// ============================================
export const getGlobalCompletionPercentage = () => {
  const tasks = load(TASKS_KEY);
  if (tasks.length === 0) return 0;
  return (tasks.filter(t => t.is_completed).length / tasks.length) * 100;
};

export const getGlobalMetrics = () => {
  const subjects = load(SUBJECTS_KEY);
  const chapters = load(CHAPTERS_KEY);
  const tasks = load(TASKS_KEY);

  const totalSubjects = subjects.length;
  const totalChapters = chapters.length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.is_completed).length;

  const masteryPercentage = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

  return {
    totalSubjects,
    totalChapters,
    totalTasks,
    completedTasks,
    masteryPercentage
  };
};

export const getSubjectCompletionStats = (subjectId) => {
  const chapterIds = load(CHAPTERS_KEY).filter(c => c.subject_id === subjectId).map(c => c.id);
  const tasks = load(TASKS_KEY).filter(t => chapterIds.includes(t.chapter_id));
  const total = tasks.length;
  const completed = tasks.filter(t => t.is_completed).length;
  return { total, completed, percentage: total === 0 ? 0 : (completed / total) * 100 };
};

export const getChapterCompletionStats = (chapterId) => {
  const tasks = load(TASKS_KEY).filter(t => t.chapter_id === chapterId);
  const total = tasks.length;
  const completed = tasks.filter(t => t.is_completed).length;
  return { total, completed, percentage: total === 0 ? 0 : (completed / total) * 100 };
};

// ============================================
// HIERARCHICAL BATCH IMPORT
// Takes parsed { units: [{ title, subtopics: [{ title }] }] }
// ============================================
export const batchImportHierarchy = (subjectId, units) => {
  const chapters = load(CHAPTERS_KEY);
  const tasks = load(TASKS_KEY);
  const existingChapterCount = chapters.filter(c => c.subject_id === subjectId).length;

  units.forEach((unit, uIdx) => {
    const chapter = {
      id: generateId(),
      subject_id: subjectId,
      title: unit.title,
      is_unit: true,
      order_index: existingChapterCount + uIdx,
    };
    chapters.push(chapter);

    unit.subtopics.forEach((sub, sIdx) => {
      tasks.push({
        id: generateId(),
        chapter_id: chapter.id,
        title: sub.title,
        is_completed: false,
        order_index: sIdx,
      });
    });
  });

  save(CHAPTERS_KEY, chapters);
  save(TASKS_KEY, tasks);
};
