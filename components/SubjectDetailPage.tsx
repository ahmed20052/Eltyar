

import React from 'react';
import { Subject, Lecture, Review, AppData } from '../types'; 
import { ARABIC_STRINGS } from '../constants';
import ProgressBar from './ProgressBar';
import LectureReviewSchedule from './LectureReviewSchedule';
import { format, isValid } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { arSA } from 'date-fns/locale/ar-SA';
import { 
    EditIcon, 
    DeleteIcon, 
    AddIcon, 
    ChevronDownIcon, 
    ArrowRightIcon,
    BookOpenIconLarge,
    IconSize, 
} from './Icons';


interface SubjectDetailPageProps {
  subject: Subject;
  lectures: Lecture[]; 
  reviews: Review[]; 
  appData: AppData; 
  onBack: () => void;
  onAddLecture: (subject: Subject) => void;
  onEditLecture: (lecture: Lecture) => void;
  onDeleteLecture: (lectureId: string, lectureName: string) => void;
  expandedLectureId: string | null;
  toggleLectureExpansion: (lectureId: string) => void;
  activeReviewIntervals: number[];
}

const SubjectDetailPage: React.FC<SubjectDetailPageProps> = ({
  subject,
  lectures,
  reviews,
  appData,
  onBack,
  onAddLecture,
  onEditLecture,
  onDeleteLecture,
  expandedLectureId,
  toggleLectureExpansion,
  activeReviewIntervals,
}) => {

  const buttonPrimaryClass = "font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-lg active:scale-[0.97] active:shadow-inner flex items-center justify-center";
  const buttonSecondaryClass = `${buttonPrimaryClass} text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600`;
  const buttonAccentClass = `${buttonPrimaryClass} text-white bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700`;

  return (
    <div className="p-4 md:p-6 min-h-screen animate-fadeInUp"> {/* Changed animation to fadeInUp for page content */}
      <header className="mb-6 md:mb-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-bold text-teal-600 dark:text-teal-400">
                {ARABIC_STRINGS.SUBJECT_PAGE_TITLE(subject.name)}
            </h1>
            <button
                onClick={onBack}
                className={buttonSecondaryClass}
            >
             <ArrowRightIcon className="mr-2 ml-0 rtl:ml-2 rtl:mr-0 transform rtl:rotate-180" /> {ARABIC_STRINGS.BACK_TO_SUBJECTS}
            </button>
        </div>
      </header>

      <section className="bg-white dark:bg-slate-800/80 backdrop-blur-lg p-5 sm:p-6 rounded-xl shadow-xl animate-subtlePopIn">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-5">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-3 sm:mb-0">
            {ARABIC_STRINGS.MANAGE_LECTURES_FOR_SUBJECT}
          </h2>
          <button
            onClick={() => onAddLecture(subject)}
            className={buttonAccentClass}
          >
            <AddIcon className="mr-2 ml-0 rtl:ml-2 rtl:mr-0" /> {ARABIC_STRINGS.ADD_LECTURE}
          </button>
        </div>

        {lectures.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <BookOpenIconLarge className="text-slate-400 dark:text-slate-500 mx-auto" />
            <p className="mt-4 text-lg font-medium text-slate-500 dark:text-slate-400">
                {ARABIC_STRINGS.NO_LECTURES_IN_SUBJECT_PROMPT}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {lectures.map((lecture, index) => {
              const progress = activeReviewIntervals.length > 0 ? (lecture.completedReviewCycles / activeReviewIntervals.length) * 100 : 0;
              const isExpanded = expandedLectureId === lecture.id;
              const activeReviewForLecture = reviews.find(r => r.lectureId === lecture.id && r.subjectId === subject.id && r.intervalCycleIndex === lecture.completedReviewCycles);
              
              return (
                <div 
                    key={lecture.id} 
                    className="p-4 bg-slate-50 dark:bg-slate-700/70 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.015] animate-listItemAppear"
                    style={{ animationDelay: `${index * 0.07}s` }}
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => toggleLectureExpansion(lecture.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleLectureExpansion(lecture.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`lecture-details-sdp-${lecture.id}`}
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <p className="text-slate-800 dark:text-slate-100 font-semibold text-xl">{lecture.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {ARABIC_STRINGS.FIRST_STUDY_DATE}: {isValid(parseISO(lecture.firstStudyDate)) ? format(parseISO(lecture.firstStudyDate), 'PPP', { locale: arSA }) : 'Invalid Date'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 rtl:space-x-reverse mt-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditLecture(lecture);}} 
                          title={ARABIC_STRINGS.EDIT_LECTURE}
                          className="text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 p-2 rounded-full hover:bg-sky-100 dark:hover:bg-sky-700/50 transition-colors">
                            <EditIcon className={IconSize}/> 
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteLecture(lecture.id, lecture.name);}} 
                          title={ARABIC_STRINGS.DELETE}
                          className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-700/50 transition-colors">
                            <DeleteIcon className={IconSize}/> 
                        </button>
                        <ChevronDownIcon className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} text-slate-500 dark:text-slate-400 w-5 h-5`} />
                      </div>
                    </div>
                    <ProgressBar 
                        progressPercent={progress} 
                        completedSteps={lecture.completedReviewCycles} 
                        totalSteps={activeReviewIntervals.length}
                    />
                  </div>
                  {isExpanded && (
                    <div id={`lecture-details-sdp-${lecture.id}`} className="overflow-hidden"> {/* Removed explicit transition classes, rely on CSS below */}
                       {lecture.notes && (
                        <div className="mt-3.5 pt-3.5 border-t border-slate-200 dark:border-slate-600">
                            <h5 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{ARABIC_STRINGS.DISPLAY_LECTURE_NOTES_TITLE}</h5>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-white dark:bg-slate-600/40 p-3 rounded-md shadow-inner">{lecture.notes}</p>
                        </div>
                       )}
                      <LectureReviewSchedule 
                        lecture={lecture} 
                        activeReviewForLecture={activeReviewForLecture} 
                        reviewIntervals={activeReviewIntervals} 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
       <style>{`
        [id^="lecture-details-sdp-"] {
            transition: max-height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-in-out 0.1s, padding-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), padding-bottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), margin-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            max-height: 0;
            opacity: 0;
            padding-top: 0;
            padding-bottom: 0;
            margin-top: 0;
            overflow: hidden;
        }
        [aria-expanded="true"] + [id^="lecture-details-sdp-"] {
            max-height: 1200px; /* Increased max-height for more content */
            opacity: 1;
            padding-top: 1rem; 
            padding-bottom: 0.75rem; 
            margin-top: 1rem; 
        }
      `}</style>
    </div>
  );
};

export default SubjectDetailPage;