

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Subject, Lecture, Review, AppData, ModalType, Theme, TaskTableView, AppView, DailyTask } from './types';
import { ARABIC_STRINGS, DEFAULT_REVIEW_INTERVALS_DAYS, LOCAL_STORAGE_KEY, THEME_STORAGE_KEY, generateReviewCycleLabels, EXPORT_APP_DATA_FILENAME_PREFIX } from './constants';
import useLocalStorage from '@/hooks/useLocalStorage'; // Updated import path
import { generateICSContent } from './services/icsService';
import {
  addDays,
  format,
  isBefore,
  isValid,
  isSameDay,
  endOfWeek,
  endOfMonth,
  isWithinInterval,
  isAfter 
} from 'date-fns';
import parseISO from 'date-fns/parseISO';
import startOfDay from 'date-fns/startOfDay';
import startOfWeek from 'date-fns/startOfWeek';
import startOfMonth from 'date-fns/startOfMonth';
import subDays from 'date-fns/subDays';
import { arSA } from 'date-fns/locale/ar-SA';

import Modal from './components/Modal';
import ConfirmationModal from './components/ConfirmationModal';
import DatePickerInput from './components/DatePickerInput';
import InlineCalendar from './components/InlineCalendar';
import WelcomeScreen from './components/WelcomeScreen';
import ThemeToggle from './components/ThemeToggle'; 
import ProgressBar from './components/ProgressBar';
import LectureReviewSchedule from './components/LectureReviewSchedule';
import SubjectDetailPage from './components/SubjectDetailPage'; 
import Sidebar from '@/components/Sidebar'; 

import { 
    EditIcon, 
    DeleteIcon, 
    AddIcon, 
    CheckCircleIcon, 
    CalendarDaysIcon, 
    FireIcon, 
    TrophyIcon, 
    SearchIcon, 
    XCircleIcon, 
    AlertTriangleIcon, 
    ClockIcon, 
    ChevronRightIcon, 
    FolderOpenIcon, 
    MagnifyingGlassIcon, 
    InboxArrowDownIcon,
    RotateCcwIcon,
    MenuIcon,
    ClipboardListIcon,
    DownloadIcon, 
    UploadCloudIcon, 
} from './components/Icons';


const initialAppData: AppData = {
  subjects: [],
  lectures: [],
  reviews: [],
  dailyTasks: [], 
  theme: 'system',
  hasWelcomed: false,
  currentStreak: 0,
  longestStreak: 0,
  lastReviewCompletionDate: null,
  customReviewIntervals: undefined, 
};

const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-teal-200 dark:bg-teal-700 text-teal-700 dark:text-teal-300 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

// Helper Component for rendering task items (reviews or custom tasks)
interface TaskItemProps {
  id: string;
  text: string;
  isCompleted?: boolean; // For custom tasks
  isReview?: boolean; // To distinguish from custom tasks
  subjectName?: string; // For reviews
  reviewTargetDate?: string; // For reviews
  onToggleComplete: (id: string) => void;
  onDelete?: (id: string) => void; // Only for custom tasks
  onEditReviewDate?: (reviewId: string, newDate: string) => void; // For reviews
  showToast: (message: string) => void; // For review completion logic
}

const TaskItem: React.FC<TaskItemProps> = ({
  id,
  text,
  isCompleted,
  isReview,
  subjectName,
  reviewTargetDate,
  onToggleComplete,
  onDelete,
  onEditReviewDate,
  showToast,
}) => {
  const today = startOfDay(new Date());
  const isReviewOverdue = isReview && reviewTargetDate && isValid(parseISO(reviewTargetDate)) && isBefore(parseISO(reviewTargetDate), today);
  const reviewDateObj = isReview && reviewTargetDate ? parseISO(reviewTargetDate) : null;
  const isReviewDateValid = isReview && reviewDateObj && isValid(reviewDateObj);
  const isFutureReview = isReview && isReviewDateValid && isAfter(reviewDateObj, today);

  const handleCompletionClick = () => {
      if (isReview) {
          if (!isReviewDateValid) {
              showToast(ARABIC_STRINGS.INVALID_REVIEW_DATE_TOAST);
          } else if (isFutureReview) {
              showToast(ARABIC_STRINGS.FUTURE_REVIEW_NOTICE_TOAST);
          } else {
              onToggleComplete(id); 
          }
      } else {
          onToggleComplete(id); 
      }
  };
  
  const completionCheckboxId = `task-checkbox-${id}`;

  return (
    <li 
        className={`flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-700/70 rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-600/80 transition-all duration-200 animate-listItemAppear
            ${isReview && isReviewOverdue ? 'border-l-4 border-red-500 dark:border-red-400' : ''}
            ${isCompleted ? 'opacity-60' : ''}
        `}
    >
      <div className="flex items-center flex-grow min-w-0">
        <input
          type="checkbox"
          id={completionCheckboxId}
          checked={isCompleted || (isReview && false)}
          onChange={handleCompletionClick}
          disabled={isReview && (!isReviewDateValid || isFutureReview)}
          className={`w-5 h-5 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 dark:focus:ring-teal-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer
             ${isReview && (!isReviewDateValid || isFutureReview) ? 'cursor-not-allowed' : ''}
          `}
        />
        <label 
            htmlFor={completionCheckboxId}
            className={`ml-3 rtl:mr-3 flex-grow text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100 break-words cursor-pointer
            ${isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : ''}
            ${isReview && isReviewOverdue ? 'text-red-600 dark:text-red-400' : ''}
          `}
        >
          {isReview && subjectName && <span className="font-bold text-teal-700 dark:text-teal-400">{subjectName}: </span>}
          {text}
          {isReview && isReviewOverdue && <span className="ml-2 rtl:mr-2 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100 px-1.5 py-0.5 rounded-full">{ARABIC_STRINGS.OVERDUE}</span>}
        </label>
      </div>
      <div className="flex items-center space-x-2 rtl:space-x-reverse pl-2 rtl:pr-2">
        {isReview && onEditReviewDate && reviewTargetDate && (
           <DatePickerInput
              value={reviewTargetDate}
              onChange={(e) => onEditReviewDate(id, e.target.value)}
              id={`review-date-daily-${id}`}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
        )}
        {!isReview && onDelete && (
          <button
            onClick={() => onDelete(id)}
            title={ARABIC_STRINGS.DELETE}
            className="p-1.5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-red-100 dark:hover:bg-red-700/30 transition-colors transform hover:scale-110 active:scale-95"
          >
            <DeleteIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </li>
  );
};

// App Component
const App: React.FC = () => {
  const [data, setData] = useLocalStorage<AppData>(LOCAL_STORAGE_KEY, initialAppData);
  const [appView, setAppView] = useState<AppView>('dashboard');
  const [selectedSubjectForDetailPageId, setSelectedSubjectForDetailPageId] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<ModalType>(ModalType.NONE);
  const [currentSubjectForModal, setCurrentSubjectForModal] = useState<Subject | null>(null);
  const [currentLectureForProcessing, setCurrentLectureForProcessing] = useState<Lecture | null>(null); 
  
  const [subjectNameInput, setSubjectNameInput] = useState('');
  const [lectureNameInput, setLectureNameInput] = useState('');
  const [firstStudyDateInput, setFirstStudyDateInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lectureNotesInput, setLectureNotesInput] = useState('');
  
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'subject' | 'lecture' | 'dailyTask'; name: string } | null>(null);
  
  const [toastMessageContent, setToastMessageContent] = useState<string | null>(null);
  const [isToastVisibleForAnimation, setIsToastVisibleForAnimation] = useState(false);
  
  const [exportSubjectId, setExportSubjectId] = useState<string>('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [taskTableView, setTaskTableView] = useState<TaskTableView>('weekly');
  const [expandedLectureId, setExpandedLectureId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [customIntervalsInput, setCustomIntervalsInput] = useState('');
  const [newCustomTaskInput, setNewCustomTaskInput] = useState('');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null); // For data import
  const [pendingImportData, setPendingImportData] = useState<AppData | null>(null); // For data import confirmation


  const getActiveReviewIntervals = useCallback((): number[] => {
    if (data.customReviewIntervals && data.customReviewIntervals.length > 0) {
      return data.customReviewIntervals;
    }
    return DEFAULT_REVIEW_INTERVALS_DAYS;
  }, [data.customReviewIntervals]);

  const activeReviewIntervals = useMemo(() => getActiveReviewIntervals(), [getActiveReviewIntervals]);
  
  const commonViewNavigationActions = useCallback(() => {
    if (window.innerWidth < 768) setIsSidebarOpen(false); 
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToDashboard = useCallback(() => {
    setAppView('dashboard');
    setSearchQuery(''); 
    commonViewNavigationActions();
  }, [commonViewNavigationActions]);

  const navigateToSubjectsView = useCallback(() => {
    navigateToDashboard(); // Subjects are part of dashboard
  }, [navigateToDashboard]);

  const navigateToDailyTasksView = useCallback(() => {
    setAppView('dailyTasksView');
    commonViewNavigationActions();
  }, [commonViewNavigationActions]);

  const navigateToTasksView = useCallback(() => {
    setAppView('tasksView');
    commonViewNavigationActions();
  }, [commonViewNavigationActions]);

  const navigateToCalendarView = useCallback(() => {
    setAppView('calendarView');
    commonViewNavigationActions();
  }, [commonViewNavigationActions]);

  const navigateToStatsView = useCallback(() => {
    setAppView('statsView');
    commonViewNavigationActions();
  }, [commonViewNavigationActions]);


  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      data.theme === 'dark' ||
      (data.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_STORAGE_KEY, data.theme); 
  }, [data.theme]);

  const handleThemeChange = (theme: Theme) => {
    setData(prev => ({ ...prev, theme }));
  };

  const handleStartApp = () => {
    setData(prev => ({ ...prev, hasWelcomed: true }));
  };

  const showToast = useCallback((message: string) => {
    setToastMessageContent(message);
  }, []);
  
  useEffect(() => {
    let fadeOutTimer: number | undefined;
    let clearMessageTimer: number | undefined;

    if (toastMessageContent) {
        setIsToastVisibleForAnimation(true);
        fadeOutTimer = window.setTimeout(() => setIsToastVisibleForAnimation(false), 3700); 
        clearMessageTimer = window.setTimeout(() => setToastMessageContent(null), 4000); 
    } else {
        setIsToastVisibleForAnimation(false); 
    }
    return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(clearMessageTimer);
    };
  }, [toastMessageContent]);
  
  const handleAddSubject = () => {
    if (!subjectNameInput.trim()) {
      showToast(ARABIC_STRINGS.PLEASE_FILL_ALL_FIELDS);
      return;
    }
    const newSubject: Subject = { id: crypto.randomUUID(), name: subjectNameInput.trim() };
    setData(prev => ({ ...prev, subjects: [...prev.subjects, newSubject] }));
    setSubjectNameInput('');
    setActiveModal(ModalType.NONE);
  };

  const handleEditSubject = () => {
    if (!subjectNameInput.trim() || !currentSubjectForModal) {
      showToast(ARABIC_STRINGS.PLEASE_FILL_ALL_FIELDS);
      return;
    }
    setData(prev => ({
      ...prev,
      subjects: prev.subjects.map(s => s.id === currentSubjectForModal.id ? { ...s, name: subjectNameInput.trim() } : s),
    }));
    setSubjectNameInput('');
    setCurrentSubjectForModal(null);
    setActiveModal(ModalType.NONE);
  };

  const openAddSubjectModal = () => {
    setSubjectNameInput('');
    setCurrentSubjectForModal(null);
    setActiveModal(ModalType.ADD_SUBJECT);
  };

  const openEditSubjectModal = (subject: Subject) => {
    setCurrentSubjectForModal(subject);
    setSubjectNameInput(subject.name);
    setActiveModal(ModalType.EDIT_SUBJECT);
  };

  const calculateNextPendingReview = useCallback((lecture: Lecture, intervals: number[]): Review | null => {
    if (lecture.completedReviewCycles >= intervals.length || intervals.length === 0) {
        return null; 
    }

    let currentBaseDate = parseISO(lecture.firstStudyDate);
    for (let i = 0; i < lecture.completedReviewCycles; i++) {
        if (intervals[i] === undefined) { 
          console.error("Interval undefined during base date calculation for completed cycle " + i);
          return null;
        }
        currentBaseDate = addDays(currentBaseDate, intervals[i]);
    }
    
    const nextIntervalIndex = lecture.completedReviewCycles;
    if (intervals[nextIntervalIndex] === undefined) {
      console.error("Next interval undefined at index " + nextIntervalIndex);
      return null;
    }
    const nextReviewTargetDate = addDays(currentBaseDate, intervals[nextIntervalIndex]);

    return {
        id: crypto.randomUUID(),
        lectureId: lecture.id,
        subjectId: lecture.subjectId,
        targetDate: format(nextReviewTargetDate, 'yyyy-MM-dd'),
        intervalCycleIndex: nextIntervalIndex,
    };
  }, []);


  const rescheduleAllPendingReviewsOnIntervalChange = useCallback((currentLectures: Lecture[], newIntervals: number[]): Review[] => {
      const newPendingReviews: Review[] = [];
      currentLectures.forEach(lecture => {
          const nextReview = calculateNextPendingReview(lecture, newIntervals);
          if (nextReview) {
              newPendingReviews.push(nextReview);
          }
      });
      return newPendingReviews;
  }, [calculateNextPendingReview]);


  const scheduleFirstReviewForNewLecture = useCallback((lecture: Lecture, existingReviews: Review[], currentActiveIntervals: number[]): Review[] => {
    const nextReview = calculateNextPendingReview(lecture, currentActiveIntervals); 
    const otherReviews = existingReviews.filter(r => r.lectureId !== lecture.id); 
    return nextReview ? [...otherReviews, nextReview] : otherReviews;
  }, [calculateNextPendingReview]);


  const handleAddLecture = () => {
    if (!lectureNameInput.trim() || !firstStudyDateInput || !currentSubjectForModal) { 
      showToast(ARABIC_STRINGS.PLEASE_FILL_ALL_FIELDS);
      return;
    }
    if (!isValid(parseISO(firstStudyDateInput))) {
      showToast(ARABIC_STRINGS.DATE_INVALID);
      return;
    }
    const newLecture: Lecture = {
      id: crypto.randomUUID(),
      subjectId: currentSubjectForModal.id,
      name: lectureNameInput.trim(),
      firstStudyDate: firstStudyDateInput,
      completedReviewCycles: 0,
      notes: lectureNotesInput.trim() || undefined,
    };
    const currentActiveIntervals = getActiveReviewIntervals();
    setData(prev => ({
      ...prev,
      lectures: [...prev.lectures, newLecture],
      reviews: scheduleFirstReviewForNewLecture(newLecture, prev.reviews, currentActiveIntervals),
    }));
    setLectureNameInput('');
    setFirstStudyDateInput(format(new Date(), 'yyyy-MM-dd'));
    setLectureNotesInput('');
    setActiveModal(ModalType.NONE);
  };

  const handleEditLecture = () => {
    if (!lectureNameInput.trim() || !firstStudyDateInput || !currentLectureForProcessing) { 
      showToast(ARABIC_STRINGS.PLEASE_FILL_ALL_FIELDS);
      return;
    }
     if (!isValid(parseISO(firstStudyDateInput))) {
      showToast(ARABIC_STRINGS.DATE_INVALID);
      return;
    }
    const currentActiveIntervals = getActiveReviewIntervals();
    setData(prevData => {
      let updatedLecture = prevData.lectures.find(l => l.id === currentLectureForProcessing!.id);
      if (!updatedLecture) return prevData;

      const firstStudyDateChanged = updatedLecture.firstStudyDate !== firstStudyDateInput;
      
      updatedLecture = { 
        ...updatedLecture, 
        name: lectureNameInput.trim(), 
        firstStudyDate: firstStudyDateInput, 
        notes: lectureNotesInput.trim() || undefined,
        completedReviewCycles: firstStudyDateChanged ? 0 : updatedLecture.completedReviewCycles 
      };
      
      const updatedLectures = prevData.lectures.map(l => 
        l.id === currentLectureForProcessing!.id ? updatedLecture! : l
      );
      
      const otherReviews = prevData.reviews.filter(r => r.lectureId !== currentLectureForProcessing!.id);
      const nextPendingReviewForThisLecture = calculateNextPendingReview(updatedLecture, currentActiveIntervals);
      const newReviews = nextPendingReviewForThisLecture ? [...otherReviews, nextPendingReviewForThisLecture] : otherReviews;
      
      return { 
        ...prevData, 
        lectures: updatedLectures, 
        reviews: newReviews 
      };
    });
    setLectureNameInput('');
    setFirstStudyDateInput(format(new Date(), 'yyyy-MM-dd'));
    setLectureNotesInput('');
    setCurrentLectureForProcessing(null); 
    setActiveModal(ModalType.NONE);
  };

  const openAddLectureModalForSubject = (subject: Subject) => {
    setCurrentSubjectForModal(subject); 
    setCurrentLectureForProcessing(null); 
    setLectureNameInput('');
    setFirstStudyDateInput(format(new Date(), 'yyyy-MM-dd'));
    setLectureNotesInput('');
    setActiveModal(ModalType.ADD_LECTURE);
  };

  const openEditLectureModalFromSubjectPage = (lecture: Lecture) => {
    const subject = data.subjects.find(s => s.id === lecture.subjectId);
    setCurrentSubjectForModal(subject || null); 
    setCurrentLectureForProcessing(lecture); 
    setLectureNameInput(lecture.name);
    setFirstStudyDateInput(lecture.firstStudyDate);
    setLectureNotesInput(lecture.notes || '');
    setActiveModal(ModalType.EDIT_LECTURE);
  };
  
  const handleDeleteConfirmation = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'subject') {
      setData(prev => {
        const lecturesToDelete = prev.lectures.filter(l => l.subjectId === itemToDelete.id).map(l => l.id);
        return {
          ...prev,
          subjects: prev.subjects.filter(s => s.id !== itemToDelete.id),
          lectures: prev.lectures.filter(l => l.subjectId !== itemToDelete.id),
          reviews: prev.reviews.filter(r => !lecturesToDelete.includes(r.lectureId)),
        };
      });
      if (selectedSubjectForDetailPageId === itemToDelete.id) {
        navigateToDashboard(); 
      }
    } else if (itemToDelete.type === 'lecture') {
      setData(prev => ({
        ...prev,
        lectures: prev.lectures.filter(l => l.id !== itemToDelete.id),
        reviews: prev.reviews.filter(r => r.lectureId !== itemToDelete.id),
      }));
    } else if (itemToDelete.type === 'dailyTask') {
      setData(prev => ({
        ...prev,
        dailyTasks: prev.dailyTasks.filter(t => t.id !== itemToDelete.id),
      }));
      showToast(ARABIC_STRINGS.TASK_DELETED_SUCCESS);
    }
    setItemToDelete(null);
    setActiveModal(ModalType.NONE);
    setExpandedLectureId(null); 
  };

  const openDeleteModal = (id: string, type: 'subject' | 'lecture' | 'dailyTask', name: string) => {
    setItemToDelete({ id, type, name });
    setActiveModal(ModalType.CONFIRM_DELETE);
  };

  const handleCompleteReview = (reviewId: string) => {
    const currentActiveIntervals = getActiveReviewIntervals();
    setData(prev => {
      const completedReview = prev.reviews.find(r => r.id === reviewId);
      if (!completedReview) return prev;

      let lectureToUpdate = prev.lectures.find(l => l.id === completedReview.lectureId);
      if (!lectureToUpdate) return prev;

      lectureToUpdate = { ...lectureToUpdate, completedReviewCycles: lectureToUpdate.completedReviewCycles + 1 };
      
      const updatedLectures = prev.lectures.map(l => 
        l.id === lectureToUpdate!.id ? lectureToUpdate! : l
      );
      
      const otherReviews = prev.reviews.filter(r => r.id !== reviewId);
      const nextPendingReview = calculateNextPendingReview(lectureToUpdate, currentActiveIntervals);
      const newReviewsList = nextPendingReview ? [...otherReviews, nextPendingReview] : otherReviews;

      const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
      let newCurrentStreak = prev.currentStreak;
      let newLongestStreak = prev.longestStreak;
      
      if (prev.lastReviewCompletionDate) {
        const lastCompletion = parseISO(prev.lastReviewCompletionDate);
        const yesterday = subDays(startOfDay(new Date()), 1);
        
        if (isSameDay(lastCompletion, startOfDay(new Date()))){
          // Multiple reviews on the same day don't break or increment streak beyond 1 for that day
        } else if (isSameDay(lastCompletion, yesterday)) {
          newCurrentStreak += 1;
        } else { 
          newCurrentStreak = 1;
        }
      } else {
        newCurrentStreak = 1; 
      }
      
      if (newCurrentStreak > newLongestStreak) {
        newLongestStreak = newCurrentStreak;
      }

      return { 
        ...prev, 
        lectures: updatedLectures, 
        reviews: newReviewsList,
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastReviewCompletionDate: todayStr,
      };
    });
    showToast(ARABIC_STRINGS.MARK_AS_COMPLETE);
  };

  const handleEditReviewDate = (reviewId: string, newDate: string) => {
     if (!isValid(parseISO(newDate))) {
      showToast(ARABIC_STRINGS.DATE_INVALID);
      return;
    }
    setData(prev => ({
      ...prev,
      reviews: prev.reviews.map(r => r.id === reviewId ? { ...r, targetDate: newDate } : r),
    }));
  };

  const handleExportICS = () => {
    const reviewsToExport = exportSubjectId === 'all' 
      ? data.reviews 
      : data.reviews.filter(r => r.subjectId === exportSubjectId);

    if (!reviewsToExport.length) {
      showToast(ARABIC_STRINGS.EXPORT_NO_REVIEWS);
      setActiveModal(ModalType.NONE);
      return;
    }
    
    const icsContent = generateICSContent(reviewsToExport, data.subjects, data.lectures);
    if (icsContent) {
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const subjectName = exportSubjectId === 'all' ? ARABIC_STRINGS.ALL_SUBJECTS : data.subjects.find(s=>s.id === exportSubjectId)?.name || '';
      link.setAttribute("download", `مراجعات-${subjectName.replace(/\s+/g, '_')}-${format(new Date(), 'yyyyMMdd')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(ARABIC_STRINGS.EXPORT_SUCCESS);
    }
    setActiveModal(ModalType.NONE);
  };
  
  const handleCalendarDateSelect = (date: Date) => setSelectedCalendarDate(date);

  const highlightedDaysForCalendar = useMemo(() => {
    const dates = new Set<string>();
    data.reviews.forEach(review => dates.add(review.targetDate));
    data.dailyTasks.forEach(task => dates.add(task.date));
    return Array.from(dates);
  }, [data.reviews, data.dailyTasks]);

  const tasksForSelectedCalendarDate = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const selectedDateStr = format(selectedCalendarDate, 'yyyy-MM-dd');
    
    const reviews = data.reviews
      .filter(review => review.targetDate === selectedDateStr)
      .map(review => {
        const subject = data.subjects.find(s => s.id === review.subjectId);
        const lecture = data.lectures.find(l => l.id === review.lectureId);
        return {
          id: review.id,
          type: 'review' as 'review' | 'custom',
          text: `${subject?.name || '-'}: ${lecture?.name || '-'}`,
          isCompleted: false, 
          date: review.targetDate,
        };
      });

    const customTasks = data.dailyTasks
      .filter(task => task.date === selectedDateStr)
      .map(task => ({
        id: task.id,
        type: 'custom' as 'review' | 'custom',
        text: task.text,
        isCompleted: task.isCompleted,
        date: task.date,
      }));
      
    return [...reviews, ...customTasks].sort((a,b) => {
        if (a.type === 'review' && b.type === 'custom') return -1;
        if (a.type === 'custom' && b.type === 'review') return 1;
        return a.text.localeCompare(b.text, 'ar');
    });
  }, [selectedCalendarDate, data.reviews, data.dailyTasks, data.subjects, data.lectures]);

  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');
  
  const displayedTasks = useMemo(() => { 
    let filtered: Review[] = [];
    const allReviewsSorted = [...data.reviews].sort((a, b) => {
        try {
            return parseISO(a.targetDate).getTime() - parseISO(b.targetDate).getTime();
        } catch (e) { return 0;}
    });

    if (taskTableView === 'daily') {
      filtered = allReviewsSorted.filter(review => {
        try {
          return isValid(parseISO(review.targetDate)) && isSameDay(parseISO(review.targetDate), today);
        } catch (e) { return false; }
      });
    } else if (taskTableView === 'weekly') {
      const weekStart = startOfWeek(today, { locale: arSA });
      const weekEnd = endOfWeek(today, { locale: arSA });
      filtered = allReviewsSorted.filter(review => {
        try {
          return isValid(parseISO(review.targetDate)) && isWithinInterval(parseISO(review.targetDate), { start: weekStart, end: weekEnd });
        } catch (e) { return false; }
      });
    } else { 
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      filtered = allReviewsSorted.filter(review => {
        try {
        return isValid(parseISO(review.targetDate)) && isWithinInterval(parseISO(review.targetDate), { start: monthStart, end: monthEnd });
        } catch (e) { return false; }
      });
    }
    return filtered;
  }, [data.reviews, taskTableView, today]);

  let emptyTasksMessage = ARABIC_STRINGS.NO_REVIEWS_SCHEDULED;
  let EmptyTasksIcon = InboxArrowDownIcon;
  if (data.subjects.length > 0 && data.lectures.length > 0 && data.reviews.length === 0 && displayedTasks.length === 0) { 
     emptyTasksMessage = ARABIC_STRINGS.NO_REVIEWS_SCHEDULED; 
  } else if (taskTableView === 'daily') emptyTasksMessage = ARABIC_STRINGS.NO_TASKS_TODAY;
  else if (taskTableView === 'weekly') emptyTasksMessage = ARABIC_STRINGS.NO_TASKS_THIS_WEEK;
  else if (taskTableView === 'monthly') emptyTasksMessage = ARABIC_STRINGS.NO_TASKS_THIS_MONTH;


  const pendingReviews = data.reviews; 
  const overdueReviews = pendingReviews.filter(r => isValid(parseISO(r.targetDate)) && isBefore(parseISO(r.targetDate), today));
  const completedReviewsCount = data.lectures.reduce((sum, l) => sum + l.completedReviewCycles, 0);
  const lecturesWithActiveReviews = new Set(data.reviews.map(r => r.lectureId)).size;
  
  const toggleLectureExpansion = (lectureId: string) => {
    setExpandedLectureId(prevId => prevId === lectureId ? null : lectureId);
  };

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) {
      return data.subjects;
    }
    const query = searchQuery.toLowerCase();
    return data.subjects.filter(subject => subject.name.toLowerCase().includes(query));
  }, [data.subjects, searchQuery]);

  const handleSaveSettings = () => {
    let newIntervalsToUse: number[] | undefined = undefined;
    if (customIntervalsInput.trim() === '') {
        newIntervalsToUse = undefined; 
    } else {
        const parsedIntervals = customIntervalsInput.split(',').map(s => parseInt(s.trim(), 10));
        if (parsedIntervals.some(isNaN) || parsedIntervals.some(n => n <= 0) || parsedIntervals.length === 0) {
            showToast(ARABIC_STRINGS.INVALID_INTERVALS_ERROR);
            return;
        }
        newIntervalsToUse = parsedIntervals;
    }

    const intervalsForReschedule = newIntervalsToUse || DEFAULT_REVIEW_INTERVALS_DAYS;
    const updatedReviews = rescheduleAllPendingReviewsOnIntervalChange(data.lectures, intervalsForReschedule);

    setData(prev => ({ 
        ...prev, 
        customReviewIntervals: newIntervalsToUse,
        reviews: updatedReviews 
    }));
    
    showToast(newIntervalsToUse ? ARABIC_STRINGS.SETTINGS_SAVED_SUCCESS : ARABIC_STRINGS.SETTINGS_SAVED_SUCCESS + " (" + ARABIC_STRINGS.DEFAULT_SETTINGS_RESTORED.replace(" بنجاح!", "") + ")");
    setActiveModal(ModalType.NONE);
  };
  
  const handleResetToDefaultSettings = () => {
    setCustomIntervalsInput(''); 
    const updatedReviews = rescheduleAllPendingReviewsOnIntervalChange(data.lectures, DEFAULT_REVIEW_INTERVALS_DAYS);
    setData(prev => ({ 
        ...prev, 
        customReviewIntervals: undefined,
        reviews: updatedReviews
    }));
    showToast(ARABIC_STRINGS.DEFAULT_SETTINGS_RESTORED);
  };

  const openSettingsModal = () => {
    setCustomIntervalsInput(data.customReviewIntervals ? data.customReviewIntervals.join(', ') : '');
    setActiveModal(ModalType.SETTINGS);
     if (window.innerWidth < 768) setIsSidebarOpen(false); 
  };

  // Data Export/Import Handlers
  const handleExportData = () => {
    try {
        const dataToExport = JSON.stringify(data, null, 2); // Pretty print for readability
        const blob = new Blob([dataToExport], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${EXPORT_APP_DATA_FILENAME_PREFIX}${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showToast(ARABIC_STRINGS.EXPORT_DATA_SUCCESS);
    } catch (error) {
        console.error("Error exporting data:", error);
        showToast(ARABIC_STRINGS.IMPORT_DATA_ERROR_GENERAL); // Re-use a general error for export too
    }
  };

  const triggerImportFileSelect = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
        if (importFileInputRef.current) importFileInputRef.current.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
            const importedData = JSON.parse(text) as AppData;
            // Basic validation for structure
            if (
                typeof importedData === 'object' &&
                importedData !== null &&
                Array.isArray(importedData.subjects) &&
                Array.isArray(importedData.lectures) &&
                Array.isArray(importedData.reviews) &&
                Array.isArray(importedData.dailyTasks) &&
                typeof importedData.theme === 'string' &&
                typeof importedData.hasWelcomed === 'boolean' &&
                typeof importedData.currentStreak === 'number' &&
                typeof importedData.longestStreak === 'number' &&
                (importedData.lastReviewCompletionDate === null || typeof importedData.lastReviewCompletionDate === 'string') &&
                (importedData.customReviewIntervals === undefined || Array.isArray(importedData.customReviewIntervals))
            ) {
                if (data.subjects.length > 0 || data.lectures.length > 0 || data.reviews.length > 0 || data.dailyTasks.length > 0) {
                     setPendingImportData(importedData);
                     setActiveModal(ModalType.CONFIRM_IMPORT_OVERWRITE);
                } else {
                    setData(importedData); // Directly set data if current data is empty
                    showToast(ARABIC_STRINGS.IMPORT_DATA_SUCCESS);
                    setActiveModal(ModalType.NONE); // Close settings modal if open
                }
            } else {
                showToast(ARABIC_STRINGS.IMPORT_DATA_INVALID_FILE);
            }
        } catch (error) {
            console.error("Error parsing imported data:", error);
            showToast(ARABIC_STRINGS.IMPORT_DATA_INVALID_FILE);
        }
    };
    reader.onerror = () => {
        showToast(ARABIC_STRINGS.IMPORT_DATA_ERROR_GENERAL);
    };
    reader.readAsText(file);
    if (importFileInputRef.current) importFileInputRef.current.value = ""; // Reset file input
  };

  const confirmImportAndOverwrite = () => {
    if (pendingImportData) {
        setData(pendingImportData);
        setPendingImportData(null);
        showToast(ARABIC_STRINGS.IMPORT_DATA_SUCCESS);
    }
    setActiveModal(ModalType.NONE); // Close confirmation, then settings modal will close
  };


  const criticallyOverdueDaysThreshold = 3;
  const dailyFocusStats = useMemo(() => {
    const criticallyOverdueDate = subDays(today, criticallyOverdueDaysThreshold);
    const criticallyOverdueCount = data.reviews.filter(r => 
        isValid(parseISO(r.targetDate)) && isBefore(parseISO(r.targetDate), criticallyOverdueDate)
    ).length;
    const dueTodayCount = data.reviews.filter(r => 
        isValid(parseISO(r.targetDate)) && isSameDay(parseISO(r.targetDate), today)
    ).length;
    return { criticallyOverdueCount, dueTodayCount };
  }, [data.reviews, today]);

  const navigateToSubjectDetail = (subjectId: string) => {
    setSelectedSubjectForDetailPageId(subjectId);
    setAppView('subjectDetail');
    commonViewNavigationActions();
  };
  
  const buttonPrimaryClass = "font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-lg active:scale-[0.97] active:shadow-inner flex items-center justify-center";
  const buttonSecondaryClass = `${buttonPrimaryClass} text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600`;
  const buttonAccentClass = `${buttonPrimaryClass} text-white bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700`;


  useEffect(() => {
    if (appView === 'subjectDetail' && selectedSubjectForDetailPageId) {
      const subjectExists = data.subjects.some(s => s.id === selectedSubjectForDetailPageId);
      if (!subjectExists) {
        console.warn(`Subject with ID ${selectedSubjectForDetailPageId} not found. Navigating to dashboard.`);
        navigateToDashboard();
      }
    }
  }, [appView, selectedSubjectForDetailPageId, data.subjects, navigateToDashboard]);

  // Daily Tasks Logic
  const handleAddCustomTask = () => {
    if (!newCustomTaskInput.trim()) {
      showToast(ARABIC_STRINGS.PLEASE_FILL_ALL_FIELDS);
      return;
    }
    const newTask: DailyTask = {
      id: crypto.randomUUID(),
      text: newCustomTaskInput.trim(),
      date: todayStr,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({ ...prev, dailyTasks: [...prev.dailyTasks, newTask] }));
    setNewCustomTaskInput('');
    showToast(ARABIC_STRINGS.TASK_ADDED_SUCCESS);
  };

  const handleToggleDailyTaskCompletion = (taskId: string) => {
    setData(prev => ({
      ...prev,
      dailyTasks: prev.dailyTasks.map(task =>
        task.id === taskId ? { ...task, isCompleted: !task.isCompleted } : task
      ),
    }));
  };

  const handleDeleteCustomTask = (taskId: string) => {
      const taskToDelete = data.dailyTasks.find(t => t.id === taskId);
      if (taskToDelete) {
          openDeleteModal(taskId, 'dailyTask', taskToDelete.text);
      }
  };

  const reviewsForToday = useMemo(() => {
    return data.reviews
      .filter(review => isValid(parseISO(review.targetDate)) && isSameDay(parseISO(review.targetDate), today))
      .sort((a,b) => { 
        const subjectA = data.subjects.find(s => s.id === a.subjectId)?.name || '';
        const subjectB = data.subjects.find(s => s.id === b.subjectId)?.name || '';
        if (subjectA.localeCompare(subjectB, 'ar') !== 0) return subjectA.localeCompare(subjectB, 'ar');
        const lectureA = data.lectures.find(l => l.id === a.lectureId)?.name || '';
        const lectureB = data.lectures.find(l => l.id === b.lectureId)?.name || '';
        return lectureA.localeCompare(lectureB, 'ar');
      });
  }, [data.reviews, data.subjects, data.lectures, today]);

  const customTasksForToday = useMemo(() => {
    return data.dailyTasks
      .filter(task => task.date === todayStr)
      .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data.dailyTasks, todayStr]);


  if (!data.hasWelcomed) {
    return <WelcomeScreen onStart={handleStartApp} />;
  }
  
  const getCurrentPageTitle = () => {
      const subjectName = selectedSubjectForDetailPageId ? data.subjects.find(s => s.id === selectedSubjectForDetailPageId)?.name : null;
      switch (appView) {
          case 'dashboard': return ARABIC_STRINGS.DASHBOARD_TITLE;
          case 'tasksView': return ARABIC_STRINGS.SCHEDULED_TASKS_LINK;
          case 'calendarView': return ARABIC_STRINGS.CALENDAR_LINK;
          case 'statsView': return ARABIC_STRINGS.STATISTICS_LINK;
          case 'dailyTasksView': return ARABIC_STRINGS.DAILY_TASKS_PAGE_TITLE;
          case 'subjectDetail': return subjectName ? ARABIC_STRINGS.SUBJECT_PAGE_TITLE(subjectName) : ARABIC_STRINGS.DASHBOARD_TITLE; 
          default: return ARABIC_STRINGS.APP_TITLE;
      }
  };

  let mainContentToRender;

  if (appView === 'subjectDetail' && selectedSubjectForDetailPageId) {
    const subject = data.subjects.find(s => s.id === selectedSubjectForDetailPageId);
    if (subject) {
      mainContentToRender = (
          <SubjectDetailPage
              subject={subject}
              lectures={data.lectures.filter(l => l.subjectId === subject.id)}
              reviews={data.reviews}
              appData={data} 
              onBack={navigateToDashboard} 
              onAddLecture={openAddLectureModalForSubject}
              onEditLecture={openEditLectureModalFromSubjectPage}
              onDeleteLecture={(lectureId, lectureName) => openDeleteModal(lectureId, 'lecture', lectureName)}
              expandedLectureId={expandedLectureId}
              toggleLectureExpansion={toggleLectureExpansion}
              activeReviewIntervals={activeReviewIntervals}
          />
      );
    } else {
      mainContentToRender = null; 
    }
  } else if (appView === 'tasksView') {
      const viewToggleButtons: { view: TaskTableView; label: string }[] = [
        { view: 'daily', label: ARABIC_STRINGS.VIEW_DAILY },
        { view: 'weekly', label: ARABIC_STRINGS.VIEW_WEEKLY },
        { view: 'monthly', label: ARABIC_STRINGS.VIEW_MONTHLY },
    ];
    mainContentToRender = (
      <section className="bg-white dark:bg-slate-800/80 backdrop-blur-lg p-5 sm:p-6 rounded-xl shadow-xl animate-subtlePopIn">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-5">
              <h2 className="text-2xl sm:text-3xl font-semibold text-teal-700 dark:text-teal-300 mb-3 sm:mb-0">{ARABIC_STRINGS.TASKS_TABLE}</h2>
              <div className="flex space-x-1 rtl:space-x-reverse p-1 bg-slate-200 dark:bg-slate-700/80 rounded-lg shadow-sm">
                  {viewToggleButtons.map(item => (
                      <button
                          key={item.view}
                          onClick={() => setTaskTableView(item.view)}
                          className={`px-3.5 py-2 text-sm font-medium rounded-md transition-colors
                              ${taskTableView === item.view 
                                  ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-md' 
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/70 dark:hover:bg-slate-600/70 active:bg-slate-300 dark:active:bg-slate-600'
                              }`}
                      >
                          {item.label}
                      </button>
                  ))}
              </div>
          </div>

          {displayedTasks.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <EmptyTasksIcon className="text-slate-400 dark:text-slate-500 mx-auto" />
              <p className="mt-4 text-lg font-medium text-slate-500 dark:text-slate-400">{emptyTasksMessage}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/60 shadow-sm">
              <table className="w-full min-w-[600px] text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-700/80">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">{ARABIC_STRINGS.TARGET_DATE}</th>
                    <th scope="col" className="px-4 py-3.5">{ARABIC_STRINGS.SUBJECT_NAME}</th>
                    <th scope="col" className="px-4 py-3.5">{ARABIC_STRINGS.LECTURE_NAME}</th>
                    <th scope="col" className="px-4 py-3.5 text-center">{ARABIC_STRINGS.ACTIONS}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                  {displayedTasks.map((review, index) => {
                    const subject = data.subjects.find(s => s.id === review.subjectId);
                    const lecture = data.lectures.find(l => l.id === review.lectureId);
                    const isReviewOverdue = isValid(parseISO(review.targetDate)) && isBefore(parseISO(review.targetDate), today);
                    
                    const reviewDateObj = parseISO(review.targetDate);
                    const isReviewDateValid = isValid(reviewDateObj);
                    const isFutureReview = isReviewDateValid && isAfter(reviewDateObj, today);
                    const canCompleteReview = isReviewDateValid && !isFutureReview;

                    return (
                      <tr 
                        key={review.id} 
                        className={`transition-colors animate-listItemAppear ${isReviewOverdue ? 'bg-red-50/70 dark:bg-red-900/40 hover:bg-red-100/70 dark:hover:bg-red-800/50' : 'bg-white dark:bg-slate-800/70 hover:bg-slate-50/70 dark:hover:bg-slate-700/70'}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <td className={`px-4 py-3 font-medium ${isReviewOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {isReviewDateValid ? format(reviewDateObj, 'PPP', { locale: arSA }) : ARABIC_STRINGS.INVALID_REVIEW_DATE_TOOLTIP }
                          {isReviewOverdue && <span className="ml-2 rtl:mr-2 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100 px-1.5 py-0.5 rounded-full">{ARABIC_STRINGS.OVERDUE}</span>}
                        </td>
                        <td className="px-4 py-3">{subject?.name || '-'}</td>
                        <td className="px-4 py-3">{lecture?.name || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center space-x-2 space-x-reverse">
                            <button
                              onClick={() => {
                                if (!isReviewDateValid) {
                                  showToast(ARABIC_STRINGS.INVALID_REVIEW_DATE_TOAST);
                                } else if (isFutureReview) {
                                  showToast(ARABIC_STRINGS.FUTURE_REVIEW_NOTICE_TOAST);
                                } else {
                                  handleCompleteReview(review.id);
                                }
                              }}
                              title={
                                !isReviewDateValid ? ARABIC_STRINGS.INVALID_REVIEW_DATE_TOOLTIP :
                                isFutureReview ? ARABIC_STRINGS.FUTURE_REVIEW_NOTICE_TOOLTIP : 
                                ARABIC_STRINGS.MARK_AS_COMPLETE
                              }
                              className={`p-1.5 rounded-full transition-all active:scale-90
                                ${canCompleteReview
                                  ? 'text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-700/30 cursor-pointer transform hover:scale-110'
                                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-400 dark:hover:text-slate-500 cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700/30'
                                }
                              `}
                            >
                              <CheckCircleIcon className="w-7 h-7"/> 
                            </button>
                            <DatePickerInput
                              value={review.targetDate}
                              onChange={(e) => handleEditReviewDate(review.id, e.target.value)}
                              id={`review-date-${review.id}`}
                              min={format(new Date(), 'yyyy-MM-dd')}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
    );
  } else if (appView === 'dailyTasksView') {
    mainContentToRender = (
        <section className="bg-white dark:bg-slate-800/80 backdrop-blur-lg p-5 sm:p-6 rounded-xl shadow-xl animate-subtlePopIn space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-teal-700 dark:text-teal-300 mb-3">{ARABIC_STRINGS.ADD_CUSTOM_TASK}</h2>
            <form 
                onSubmit={(e) => { e.preventDefault(); handleAddCustomTask(); }}
                className="flex flex-col sm:flex-row items-stretch gap-3"
            >
                <input
                    type="text"
                    value={newCustomTaskInput}
                    onChange={(e) => setNewCustomTaskInput(e.target.value)}
                    placeholder={ARABIC_STRINGS.ADD_CUSTOM_TASK_PLACEHOLDER}
                    className="flex-grow px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-base"
                />
                <button type="submit" className={`${buttonAccentClass} py-2.5 px-6 text-base`}>
                    <AddIcon className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 w-5 h-5" />
                    {ARABIC_STRINGS.ADD_TASK_BUTTON}
                </button>
            </form>
          </div>
          
          <div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3">{ARABIC_STRINGS.TODAYS_REVIEWS_SECTION_TITLE}</h3>
              {reviewsForToday.length > 0 ? (
                  <ul className="space-y-3">
                      {reviewsForToday.map(review => {
                          const subject = data.subjects.find(s => s.id === review.subjectId);
                          const lecture = data.lectures.find(l => l.id === review.lectureId);
                          return (
                              <TaskItem
                                  key={`review-${review.id}`}
                                  id={review.id}
                                  text={lecture?.name || 'اسم المحاضرة غير معروف'}
                                  isReview={true}
                                  subjectName={subject?.name}
                                  reviewTargetDate={review.targetDate}
                                  onToggleComplete={handleCompleteReview}
                                  onEditReviewDate={handleEditReviewDate}
                                  showToast={showToast}
                              />
                          );
                      })}
                  </ul>
              ) : (
                  <p className="text-slate-500 dark:text-slate-400 italic text-sm">{ARABIC_STRINGS.NO_REVIEWS_DUE_TODAY}</p>
              )}
          </div>

          <div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3">{ARABIC_STRINGS.MY_TASKS_FOR_TODAY_SECTION_TITLE}</h3>
              {customTasksForToday.length > 0 ? (
                  <ul className="space-y-3">
                      {customTasksForToday.map(task => (
                          <TaskItem
                              key={`custom-${task.id}`}
                              id={task.id}
                              text={task.text}
                              isCompleted={task.isCompleted}
                              onToggleComplete={handleToggleDailyTaskCompletion}
                              onDelete={handleDeleteCustomTask}
                              showToast={showToast} 
                          />
                      ))}
                  </ul>
              ) : (
                  <p className="text-slate-500 dark:text-slate-400 italic text-sm">{ARABIC_STRINGS.NO_CUSTOM_TASKS_TODAY}</p>
              )}
          </div>
          
          {reviewsForToday.length === 0 && customTasksForToday.length === 0 && (
             <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  <ClipboardListIcon className="text-slate-400 dark:text-slate-500 mx-auto w-12 h-12" />
                  <p className="mt-4 text-md font-medium text-slate-500 dark:text-slate-400">{ARABIC_STRINGS.ALL_TASKS_COMPLETED_FOR_TODAY}</p>
              </div>
          )}

        </section>
    );
  } else if (appView === 'calendarView') {
     mainContentToRender = (
        <section className="bg-white dark:bg-slate-800/80 backdrop-blur-lg p-5 sm:p-6 rounded-xl shadow-xl animate-subtlePopIn">
          <h2 className="text-2xl sm:text-3xl font-semibold text-teal-700 dark:text-teal-300 mb-4">{ARABIC_STRINGS.CALENDAR_VIEW_TITLE}</h2>
          <InlineCalendar
            reviews={data.reviews} 
            onDateSelect={handleCalendarDateSelect}
            selectedDate={selectedCalendarDate}
            highlightedDays={highlightedDaysForCalendar} 
          />
          {selectedCalendarDate && (
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/80">
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-3">
                {ARABIC_STRINGS.TASKS_FOR_DATE} {format(selectedCalendarDate, 'PPP', { locale: arSA })}
              </h3>
              {tasksForSelectedCalendarDate.length > 0 ? (
                <ul className="space-y-2">
                  {tasksForSelectedCalendarDate.map(task => (
                    <li key={task.id} className={`p-3 rounded-md text-sm shadow-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-600/80 ${task.isCompleted ? 'bg-slate-200 dark:bg-slate-600/50 opacity-70' : 'bg-slate-100 dark:bg-slate-700/60'}`}>
                       {task.type === 'custom' && task.isCompleted && <CheckCircleIcon className="inline w-4 h-4 mr-1.5 ml-0 rtl:ml-1.5 rtl:mr-0 text-green-500 dark:text-green-400" />}
                       <span className={task.isCompleted ? 'line-through' : ''}>{task.text}</span>
                       {task.type === 'review' && <span className="text-xs text-teal-600 dark:text-teal-500 ml-1 rtl:mr-1"> (مراجعة)</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 italic">{ARABIC_STRINGS.NO_TASKS_FOR_SELECTED_DATE}</p>
              )}
            </div>
          )}
        </section>
     );
  } else if (appView === 'statsView') {
    mainContentToRender = (
        <section className="bg-white dark:bg-slate-800/80 backdrop-blur-lg p-5 sm:p-6 rounded-xl shadow-xl animate-subtlePopIn">
          <h2 className="text-2xl sm:text-3xl font-semibold text-teal-700 dark:text-teal-300 mb-6">{ARABIC_STRINGS.STATISTICS}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4"> 
              {[
                  { icon: <CheckCircleIcon className="text-green-500 dark:text-green-400"/>, label: ARABIC_STRINGS.REVIEWS_COMPLETED_COUNT, value: completedReviewsCount, color: 'text-green-600 dark:text-green-400' },
                  { icon: <CalendarDaysIcon className="text-sky-500 dark:text-sky-400"/>, label: ARABIC_STRINGS.REVIEWS_PENDING_COUNT, value: pendingReviews.length, color: 'text-sky-600 dark:text-sky-400' },
                  { icon: <AlertTriangleIcon className="w-6 h-6 text-red-500 dark:text-red-400"/>, label: ARABIC_STRINGS.REVIEWS_OVERDUE_COUNT, value: overdueReviews.length, color: overdueReviews.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300' },
                  { icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-500 dark:text-indigo-400"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>, label: ARABIC_STRINGS.TOTAL_LECTURES_WITH_REVIEWS, value: lecturesWithActiveReviews, color: 'text-slate-600 dark:text-slate-300' },
              ].map(stat => (
                    <div key={stat.label} className="flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-700/80 rounded-xl shadow-md hover:bg-slate-200/80 dark:hover:bg-slate-600/90 transition-all hover:scale-105 text-center h-full">
                      <div className="mb-2 text-3xl">{stat.icon}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                      <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
              ))}
                <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-700/80 rounded-xl shadow-md hover:bg-slate-200/80 dark:hover:bg-slate-600/90 transition-all hover:scale-105 text-center">
                  <FireIcon className="w-10 h-10 text-orange-500 dark:text-orange-400 mr-3 ml-0 rtl:ml-3 rtl:mr-0"/>
                  <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{ARABIC_STRINGS.CURRENT_STREAK}</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.currentStreak} {data.currentStreak === 1 ? ARABIC_STRINGS.DAY_UNIT : ARABIC_STRINGS.DAYS_UNIT}</p>
                  </div>
              </div>
              <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-700/80 rounded-xl shadow-md hover:bg-slate-200/80 dark:hover:bg-slate-600/90 transition-all hover:scale-105 text-center">
                  <TrophyIcon className="w-10 h-10 text-amber-500 dark:text-amber-400 mr-3 ml-0 rtl:ml-3 rtl:mr-0"/>
                  <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{ARABIC_STRINGS.LONGEST_STREAK}</p>
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.longestStreak} {data.longestStreak === 1 ? ARABIC_STRINGS.DAY_UNIT : ARABIC_STRINGS.DAYS_UNIT}</p>
                  </div>
              </div>
          </div>
        </section>
    );
  } else { // Default to Dashboard view
    mainContentToRender = (
        <>
            {/* Daily Focus Section - Dashboard */}
            {(dailyFocusStats.criticallyOverdueCount > 0 || dailyFocusStats.dueTodayCount > 0) && (
              <section className="bg-white dark:bg-slate-800/80 backdrop-blur-lg p-5 sm:p-6 rounded-xl shadow-xl animate-subtlePopIn mb-6 md:mb-8">
                <h2 className="text-xl font-semibold text-teal-700 dark:text-teal-300 mb-4">{ARABIC_STRINGS.DAILY_FOCUS_TITLE}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dailyFocusStats.criticallyOverdueCount > 0 && (
                    <div className="flex items-center p-3.5 bg-red-100 dark:bg-red-800/60 rounded-lg text-red-700 dark:text-red-300 shadow-sm">
                      <AlertTriangleIcon className="w-7 h-7 mr-2.5 ml-0 rtl:ml-2.5 rtl:mr-0" />
                      <div>
                        <span className="font-medium text-sm">{ARABIC_STRINGS.CRITICALLY_OVERDUE_REVIEWS}: </span>
                        <span className="font-bold text-lg">{dailyFocusStats.criticallyOverdueCount}</span>
                      </div>
                    </div>
                  )}
                  {dailyFocusStats.dueTodayCount > 0 && (
                    <div className="flex items-center p-3.5 bg-sky-100 dark:bg-sky-800/60 rounded-lg text-sky-700 dark:text-sky-300 shadow-sm">
                      <ClockIcon className="w-7 h-7 mr-2.5 ml-0 rtl:ml-2.5 rtl:mr-0" />
                      <div>
                        <span className="font-medium text-sm">{ARABIC_STRINGS.DUE_TODAY_REVIEWS}: </span>
                        <span className="font-bold text-lg">{dailyFocusStats.dueTodayCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Subjects Management Section - Dashboard */}
            <section className="bg-white dark:bg-slate-800/80 backdrop-blur-lg p-5 sm:p-6 rounded-xl shadow-xl animate-subtlePopIn">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-5">
                <h2 className="text-2xl sm:text-3xl font-semibold text-teal-700 dark:text-teal-300 mb-3 sm:mb-0">{ARABIC_STRINGS.MANAGE_SUBJECTS_LECTURES}</h2>
                <button
                    onClick={openAddSubjectModal}
                    className={`${buttonAccentClass} py-2 px-4 text-sm sm:text-base`}
                >
                    <AddIcon className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 w-5 h-5 sm:w-6 sm:h-6" /> 
                    {ARABIC_STRINGS.ADD_SUBJECT}
                </button>
              </div>
              
              <div className="mb-6 relative">
                <div className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3.5 rtl:pl-3.5 pointer-events-none">
                  <SearchIcon className="text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={ARABIC_STRINGS.SEARCH_PLACEHOLDER}
                  className="w-full pl-4 pr-12 rtl:pr-4 rtl:pl-12 py-3 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center pl-3.5 rtl:pr-3.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    title={ARABIC_STRINGS.CLEAR_SEARCH}
                  >
                    <XCircleIcon />
                  </button>
                )}
              </div>

              {filteredSubjects.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                  {searchQuery ? <MagnifyingGlassIcon className="text-slate-400 dark:text-slate-500 mx-auto"/> : <FolderOpenIcon className="text-slate-400 dark:text-slate-500 mx-auto" />}
                  <p className="mt-4 text-lg font-medium text-slate-500 dark:text-slate-400">
                      {searchQuery ? ARABIC_STRINGS.NO_SEARCH_RESULTS : ARABIC_STRINGS.NO_SUBJECTS_PROMPT}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubjects.map((subject, index) => (
                    <div 
                      key={subject.id} 
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/70 p-4 rounded-lg shadow-lg hover:shadow-xl hover:bg-slate-100 dark:hover:bg-slate-700/90 transition-all duration-300 cursor-pointer hover:scale-[1.02] animate-listItemAppear"
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => navigateToSubjectDetail(subject.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigateToSubjectDetail(subject.id)}
                    >
                      <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                          <HighlightMatch text={subject.name} query={searchQuery} />
                      </h3>
                      <div className="flex items-center space-x-1.5 rtl:space-x-reverse">
                        <button 
                            onClick={(e) => { e.stopPropagation(); openEditSubjectModal(subject); }} 
                            className="text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 transition-colors p-2 rounded-full hover:bg-sky-100 dark:hover:bg-sky-700/50"
                            title={ARABIC_STRINGS.EDIT}
                        >
                            <EditIcon />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); openDeleteModal(subject.id, 'subject', subject.name); }} 
                            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50"
                            title={ARABIC_STRINGS.DELETE}
                        >
                            <DeleteIcon />
                        </button>
                        <ChevronRightIcon className="text-slate-400 dark:text-slate-500 transform rtl:rotate-180" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            
            {data.subjects.length === 0 && !searchQuery && ( 
                 <div className="mt-6 text-center p-10 bg-white dark:bg-slate-800/80 backdrop-blur-lg rounded-xl shadow-xl animate-subtlePopIn">
                    <h2 className="text-3xl font-semibold text-teal-700 dark:text-teal-400">
                        {ARABIC_STRINGS.APP_TITLE}
                    </h2>
                    <p className="mt-3 text-slate-600 dark:text-slate-400 text-lg">
                        {ARABIC_STRINGS.NO_SUBJECTS_PROMPT}
                    </p>
                </div>
            )}
        </>
    );
  }

  let toastTransformStyle: React.CSSProperties = { transitionProperty: 'transform, opacity' };
  if (isSidebarOpen) {
    if (typeof window !== 'undefined') {
        if (window.innerWidth >= 1024) { // lg screens
            toastTransformStyle.transform = 'translateX(-18rem)';
        } else if (window.innerWidth >= 768) { // md screens
            toastTransformStyle.transform = 'translateX(-16rem)';
        }
    }
  }


  return (
    <div className="flex flex-row-reverse h-screen overflow-hidden"> 
        <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            appTitle={ARABIC_STRINGS.APP_TITLE}
            onNavigateToDashboard={navigateToDashboard} 
            onNavigateToSubjectsView={navigateToSubjectsView} 
            onNavigateToDailyTasksView={navigateToDailyTasksView} 
            onNavigateToTasksView={navigateToTasksView}
            onNavigateToCalendarView={navigateToCalendarView}
            onNavigateToStatsView={navigateToStatsView}
            onOpenExportModal={() => { setActiveModal(ModalType.EXPORT_CALENDAR); if (window.innerWidth < 768) setIsSidebarOpen(false);}}
            onOpenSettingsModal={openSettingsModal}
            currentAppView={appView}
        />
      {/* Hidden file input for data import */}
      <input 
        type="file" 
        ref={importFileInputRef} 
        onChange={handleImportFileSelected} 
        accept=".json" 
        style={{ display: 'none' }} 
        aria-hidden="true"
      />


      <main ref={mainContentRef} className="flex-1 flex flex-col overflow-x-hidden">
        <div className="p-4 md:p-6 lg:p-8 flex-grow overflow-y-auto"> 
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <div className="md:hidden"> 
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
                aria-label={ARABIC_STRINGS.OPEN_MENU}
              >
                <MenuIcon />
              </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-teal-600 dark:text-teal-400">
              {getCurrentPageTitle()}
            </h1>
             <div className="md:hidden w-10 h-10"></div> 
          </div>
          
          {toastMessageContent && (
            <div 
              className={`fixed top-5 right-5 md:top-8 md:right-8 bg-teal-500 text-white py-3 px-5 rounded-lg shadow-2xl z-[100] transition-all duration-300 ease-in-out animate-slideInFromRight ${isToastVisibleForAnimation ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
               style={toastTransformStyle} 
            >
              <CheckCircleIcon className="inline w-6 h-6 mr-2 ml-0 rtl:ml-2 rtl:mr-0" />
              {toastMessageContent}
            </div>
          )}

          {mainContentToRender}
        </div>
      </main>


      {/* Modals */}
      <Modal
        isOpen={activeModal === ModalType.ADD_SUBJECT || activeModal === ModalType.EDIT_SUBJECT}
        onClose={() => setActiveModal(ModalType.NONE)}
        title={activeModal === ModalType.ADD_SUBJECT ? ARABIC_STRINGS.ADD_SUBJECT : ARABIC_STRINGS.EDIT_SUBJECT}
      >
        <form onSubmit={(e) => { e.preventDefault(); activeModal === ModalType.ADD_SUBJECT ? handleAddSubject() : handleEditSubject(); }}>
          <label htmlFor="subjectName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{ARABIC_STRINGS.SUBJECT_NAME_PLACEHOLDER}</label>
          <input
            type="text"
            id="subjectName"
            value={subjectNameInput}
            onChange={(e) => setSubjectNameInput(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
            required
          />
          <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
            <button type="button" onClick={() => setActiveModal(ModalType.NONE)} className={buttonSecondaryClass}>{ARABIC_STRINGS.CANCEL}</button>
            <button type="submit" className={buttonAccentClass}>{ARABIC_STRINGS.SAVE}</button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={activeModal === ModalType.ADD_LECTURE || activeModal === ModalType.EDIT_LECTURE}
        onClose={() => setActiveModal(ModalType.NONE)}
        title={activeModal === ModalType.ADD_LECTURE ? ARABIC_STRINGS.ADD_LECTURE : ARABIC_STRINGS.EDIT_LECTURE}
        size="lg"
      >
        <form onSubmit={(e) => { e.preventDefault(); activeModal === ModalType.ADD_LECTURE ? handleAddLecture() : handleEditLecture(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="lectureName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{ARABIC_STRINGS.LECTURE_NAME_PLACEHOLDER}</label>
              <input
                type="text"
                id="lectureName"
                value={lectureNameInput}
                onChange={(e) => setLectureNameInput(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                required
              />
            </div>
            <div>
               <DatePickerInput
                id="firstStudyDate"
                label={ARABIC_STRINGS.FIRST_STUDY_DATE}
                value={firstStudyDateInput}
                onChange={(e) => setFirstStudyDateInput(e.target.value)}
                required
              />
            </div>
            <div>
                <label htmlFor="lectureNotes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{ARABIC_STRINGS.LECTURE_NOTES_LABEL}</label>
                <textarea
                    id="lectureNotes"
                    value={lectureNotesInput}
                    onChange={(e) => setLectureNotesInput(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                />
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
            <button type="button" onClick={() => setActiveModal(ModalType.NONE)} className={buttonSecondaryClass}>{ARABIC_STRINGS.CANCEL}</button>
            <button type="submit" className={buttonAccentClass}>{ARABIC_STRINGS.SAVE}</button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={activeModal === ModalType.CONFIRM_DELETE}
        onClose={() => setActiveModal(ModalType.NONE)}
        onConfirm={handleDeleteConfirmation}
        title={ARABIC_STRINGS.CONFIRM_DELETE_TITLE}
        message={
          itemToDelete?.type === 'subject'
            ? ARABIC_STRINGS.CONFIRM_DELETE_SUBJECT_MSG(itemToDelete.name)
            : itemToDelete?.type === 'lecture'
            ? ARABIC_STRINGS.CONFIRM_DELETE_LECTURE_MSG(itemToDelete?.name || '')
            : itemToDelete?.type === 'dailyTask'
            ? ARABIC_STRINGS.CONFIRM_DELETE_TASK_MSG(itemToDelete?.name || '')
            : ''
        }
      />
      
      <Modal
        isOpen={activeModal === ModalType.EXPORT_CALENDAR}
        onClose={() => setActiveModal(ModalType.NONE)}
        title={ARABIC_STRINGS.EXPORT_CALENDAR}
      >
        <div>
          <label htmlFor="exportSubjectSelect" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{ARABIC_STRINGS.SELECT_SUBJECT_TO_EXPORT}</label>
          <select 
            id="exportSubjectSelect"
            value={exportSubjectId}
            onChange={(e) => setExportSubjectId(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-slate-700 dark:text-white"
          >
            <option value="all">{ARABIC_STRINGS.ALL_SUBJECTS}</option>
            {data.subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <div className="mt-6 flex justify-end space-x-3 space-x-reverse">
            <button type="button" onClick={() => setActiveModal(ModalType.NONE)} className={buttonSecondaryClass}>{ARABIC_STRINGS.CANCEL}</button>
            <button onClick={handleExportICS} className={`${buttonAccentClass} bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700`}>{ARABIC_STRINGS.EXPORT_CALENDAR}</button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === ModalType.SETTINGS}
        onClose={() => setActiveModal(ModalType.NONE)}
        title={ARABIC_STRINGS.SETTINGS_TITLE}
        size="lg" 
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }}>
          <div className="space-y-6"> 
            <div>
              <label htmlFor="customIntervals" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{ARABIC_STRINGS.CUSTOM_REVIEW_INTERVALS_LABEL}</label>
              <input
                type="text"
                id="customIntervals"
                value={customIntervalsInput}
                onChange={(e) => setCustomIntervalsInput(e.target.value)}
                placeholder={ARABIC_STRINGS.CUSTOM_REVIEW_INTERVALS_PLACEHOLDER}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {ARABIC_STRINGS.CUSTOM_REVIEW_INTERVALS_HELP(DEFAULT_REVIEW_INTERVALS_DAYS.join(', '))}
              </p>
            </div>
            <hr className="border-slate-200 dark:border-slate-700" />
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{ARABIC_STRINGS.THEME_SETTINGS_LABEL || "إعدادات المظهر"}</label> 
                <ThemeToggle currentTheme={data.theme} onThemeChange={handleThemeChange} />
            </div>
            <hr className="border-slate-200 dark:border-slate-700" />
            <div>
                <h4 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-3">{ARABIC_STRINGS.DATA_MANAGEMENT_TITLE}</h4>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                        type="button" 
                        onClick={handleExportData} 
                        className={`${buttonSecondaryClass} bg-sky-500 hover:bg-sky-600 text-white dark:text-white flex-1`}
                    >
                        <DownloadIcon className="mr-2 ml-0 rtl:ml-2 rtl:mr-0" />
                        {ARABIC_STRINGS.EXPORT_DATA}
                    </button>
                    <button 
                        type="button" 
                        onClick={triggerImportFileSelect} 
                        className={`${buttonSecondaryClass} bg-green-500 hover:bg-green-600 text-white dark:text-white flex-1`}
                    >
                         <UploadCloudIcon className="mr-2 ml-0 rtl:ml-2 rtl:mr-0" />
                        {ARABIC_STRINGS.IMPORT_DATA}
                    </button>
                </div>
                 <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {ARABIC_STRINGS.SELECT_FILE_TO_IMPORT}. {ARABIC_STRINGS.CONFIRM_IMPORT_OVERWRITE_MSG.split('.')[0]}.
                </p>
            </div>
          </div>
          <div className="mt-8 flex justify-between items-center"> 
            <button 
                type="button" 
                onClick={handleResetToDefaultSettings} 
                className={`${buttonSecondaryClass} bg-amber-400 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-700 text-white dark:text-white flex items-center`}
                title={ARABIC_STRINGS.RESET_TO_DEFAULT_SETTINGS}
            >
                <RotateCcwIcon className="mr-1.5 ml-0 rtl:ml-1.5 rtl:mr-0 w-5 h-5" />
                {ARABIC_STRINGS.RESET_TO_DEFAULT_SETTINGS}
            </button>
            <div className="flex space-x-3 space-x-reverse">
                <button type="button" onClick={() => setActiveModal(ModalType.NONE)} className={buttonSecondaryClass}>{ARABIC_STRINGS.CANCEL}</button>
                <button type="submit" className={buttonAccentClass}>{ARABIC_STRINGS.SAVE_SETTINGS}</button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={activeModal === ModalType.CONFIRM_IMPORT_OVERWRITE}
        onClose={() => { setPendingImportData(null); setActiveModal(ModalType.NONE); }}
        onConfirm={confirmImportAndOverwrite}
        title={ARABIC_STRINGS.CONFIRM_IMPORT_TITLE}
        message={ARABIC_STRINGS.CONFIRM_IMPORT_OVERWRITE_MSG}
      />
      
    </div>
  );
};

export default App;
