

export interface Subject {
  id: string;
  name: string; // اسم المادة
}

export interface Lecture {
  id: string;
  subjectId: string;
  name: string; // اسم المحاضرة
  firstStudyDate: string; // تاريخ أول مذاكرة (ISO YYYY-MM-DD)
  completedReviewCycles: number; // عدد دورات المراجعة المكتملة لهذه المحاضرة
  notes?: string; // ملاحظات على المحاضرة
}

// A single upcoming review item
export interface Review {
  id: string;
  lectureId: string;
  subjectId: string; 
  targetDate: string; // ISO YYYY-MM-DD, التاريخ المستهدف
  // This review corresponds to which interval after the last one.
  // e.g., 0 means interval REVIEW_INTERVALS_DAYS[0] after firstStudyDate
  // 1 means interval REVIEW_INTERVALS_DAYS[1] after previous review completion date.
  intervalCycleIndex: number; 
}

export type Theme = 'light' | 'dark' | 'system';

export interface MotivationalQuote {
  id: string;
  text: string;
}

export interface DailyTask {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD
  isCompleted: boolean;
  createdAt: string; // ISO string for timestamp
}

export interface AppData {
  subjects: Subject[];
  lectures: Lecture[];
  reviews: Review[]; // قائمة جلسات المراجعة المجدولة (النشطة فقط)
  dailyTasks: DailyTask[]; // مهام يومية مخصصة
  theme: Theme;
  hasWelcomed: boolean;
  currentStreak: number;
  longestStreak: number;
  lastReviewCompletionDate: string | null; // ISO date string YYYY-MM-DD
  customReviewIntervals?: number[]; // فترات المراجعة المخصصة
}

export enum ModalType {
  NONE,
  ADD_SUBJECT,
  EDIT_SUBJECT,
  ADD_LECTURE,
  EDIT_LECTURE,
  CONFIRM_DELETE,
  EXPORT_CALENDAR,
  SETTINGS,
  CONFIRM_IMPORT_OVERWRITE, // Added for data import confirmation
  // VIEW_LECTURE_SCHEDULE // Example if we make it a modal, not used for inline expansion
}

export type TaskTableView = 'daily' | 'weekly' | 'monthly';

export type ReviewStatus = 'completed' | 'next_upcoming' | 'future_potential' | 'fully_completed';

export interface DisplayedReviewInfo {
  date: Date;
  status: ReviewStatus;
  label: string;
}

// Helper type for components that need lecture with its subject name
export interface LectureWithSubjectName extends Lecture {
  subjectName: string;
}

// For managing main application views
export type AppView =
  | 'dashboard'
  | 'subjectDetail'
  // | 'subjectsView' // Removed, will be part of dashboard
  | 'tasksView'
  | 'calendarView'
  | 'statsView'
  | 'dailyTasksView'; // New view for daily tasks
  // | 'geminiQuestionsView'; // Removed as AI feature is deleted