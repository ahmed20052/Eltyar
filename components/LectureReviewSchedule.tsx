
import React from 'react';
import { Lecture, Review, ReviewStatus, DisplayedReviewInfo } from '../types';
import { ARABIC_STRINGS, generateReviewCycleLabels } from '../constants';
import { addDays, format, isValid } from 'date-fns';
import parseISO from 'date-fns/parseISO';
import { arSA } from 'date-fns/locale/ar-SA';
import { CheckIconSolid, StarIconSolid, CalendarIconOutline } from './Icons'; // Import from centralized Icons file

interface LectureReviewScheduleProps {
  lecture: Lecture;
  activeReviewForLecture: Review | undefined; 
  reviewIntervals: number[]; // Active review intervals (custom or default)
}

const LectureReviewSchedule: React.FC<LectureReviewScheduleProps> = ({ lecture, activeReviewForLecture, reviewIntervals }) => {
  if (reviewIntervals.length === 0) {
    return (
         <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
            <p className="text-sm text-slate-500 dark:text-slate-400">
                لا توجد فترات مراجعة محددة. يرجى التحقق من الإعدادات.
            </p>
        </div>
    );
  }
  
  if (lecture.completedReviewCycles >= reviewIntervals.length && !activeReviewForLecture) { // Adjusted condition
    return (
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
        <p className="text-sm text-green-600 dark:text-green-400 flex items-center">
          <CheckIconSolid className="w-5 h-5 mr-2 ml-0 rtl:ml-2 rtl:mr-0" />
          {ARABIC_STRINGS.REVIEW_STATUS_FULLY_COMPLETED}
        </p>
      </div>
    );
  }

  const displayedReviews: DisplayedReviewInfo[] = [];
  const cycleLabels = generateReviewCycleLabels(reviewIntervals.length);
  let lastProjectedDate = parseISO(lecture.firstStudyDate);

  // 1. Project completed reviews
  for (let i = 0; i < lecture.completedReviewCycles; i++) {
    if (i < reviewIntervals.length) { // Ensure we don't go out of bounds
        lastProjectedDate = addDays(lastProjectedDate, reviewIntervals[i]);
        displayedReviews.push({
            date: lastProjectedDate,
            status: 'completed',
            label: cycleLabels[i] || `${ARABIC_STRINGS.REVIEW_CYCLE_LABEL(i + 1)}`,
        });
    }
  }

  // 2. Add the next upcoming review (actual data if available)
  let nextUpcomingReviewBaseDate = lastProjectedDate; // This is the date the last completed review was due/completed around
  
  if (activeReviewForLecture && isValid(parseISO(activeReviewForLecture.targetDate))) {
    displayedReviews.push({
      date: parseISO(activeReviewForLecture.targetDate),
      status: 'next_upcoming',
      label: cycleLabels[lecture.completedReviewCycles] || `${ARABIC_STRINGS.REVIEW_CYCLE_LABEL(lecture.completedReviewCycles + 1)}`,
    });
    nextUpcomingReviewBaseDate = parseISO(activeReviewForLecture.targetDate); // Base for future potentials
  } else if (lecture.completedReviewCycles < reviewIntervals.length) {
    // If no activeReviewForLecture, but more reviews are due per intervals, project the next one
    const nextProjectedDate = addDays(lastProjectedDate, reviewIntervals[lecture.completedReviewCycles]);
     displayedReviews.push({
      date: nextProjectedDate,
      status: 'next_upcoming', // Treat as next upcoming conceptually
      label: cycleLabels[lecture.completedReviewCycles] || `${ARABIC_STRINGS.REVIEW_CYCLE_LABEL(lecture.completedReviewCycles + 1)}`,
    });
    nextUpcomingReviewBaseDate = nextProjectedDate;
  }


  // 3. Project future potential reviews after the next upcoming one
  let futurePotentialBaseDate = nextUpcomingReviewBaseDate;
  for (let i = lecture.completedReviewCycles + 1; i < reviewIntervals.length; i++) {
    if (reviewIntervals[i] === undefined) break;
    futurePotentialBaseDate = addDays(futurePotentialBaseDate, reviewIntervals[i]);
    displayedReviews.push({
      date: futurePotentialBaseDate,
      status: 'future_potential',
      label: cycleLabels[i] || `${ARABIC_STRINGS.REVIEW_CYCLE_LABEL(i + 1)}`,
    });
  }


  return (
    <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-600 space-y-2 animate-fadeIn">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
        {ARABIC_STRINGS.LECTURE_REVIEW_SCHEDULE_TITLE}
      </h4>
      <ul className="space-y-2">
        {displayedReviews.slice(0, 5).map((reviewInfo, index) => { // Show up to 5
          let statusText = '';
          let icon = <CalendarIconOutline className="text-slate-500 dark:text-slate-400" />;
          let textColor = 'text-slate-600 dark:text-slate-300';
          let dateStyle = '';
          const dayOfWeek = isValid(reviewInfo.date) ? format(reviewInfo.date, 'EEEE', { locale: arSA }) : '';

          if (reviewInfo.status === 'completed') {
            statusText = ARABIC_STRINGS.REVIEW_STATUS_COMPLETED;
            icon = <CheckIconSolid className="text-green-500 dark:text-green-400" />;
            textColor = 'text-green-600 dark:text-green-400 line-through';
            dateStyle = 'line-through';
          } else if (reviewInfo.status === 'next_upcoming') {
            statusText = ARABIC_STRINGS.REVIEW_STATUS_NEXT_UPCOMING;
            icon = <StarIconSolid className="text-sky-500 dark:text-sky-400" />;
            textColor = 'text-sky-600 dark:text-sky-400 font-semibold';
          } else if (reviewInfo.status === 'future_potential') {
            statusText = ARABIC_STRINGS.REVIEW_STATUS_FUTURE_POTENTIAL;
            icon = <CalendarIconOutline className="text-slate-400 dark:text-slate-500" />;
            textColor = 'text-slate-500 dark:text-slate-400';
          }

          return (
            <li key={index} className={`flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-md text-xs transition-colors hover:bg-slate-200 dark:hover:bg-slate-600/80`}>
              <div className="flex items-center">
                <span className="mr-2 ml-0 rtl:ml-2 rtl:mr-0">{icon}</span>
                <span className={`font-medium ${textColor}`}>
                  {reviewInfo.label}
                  {dayOfWeek && ` (${dayOfWeek})`}
                  :
                </span>
                <span className={`mr-2 rtl:mr-0 ml-2 rtl:ml-0 ${textColor} ${dateStyle}`}>
                  {isValid(reviewInfo.date) ? format(reviewInfo.date, 'PPP', { locale: arSA }) : "تاريخ غير صالح"}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                ${reviewInfo.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : ''}
                ${reviewInfo.status === 'next_upcoming' ? 'bg-sky-100 text-sky-700 dark:bg-sky-700 dark:text-sky-100' : ''}
                ${reviewInfo.status === 'future_potential' ? 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-200' : ''}
              `}>
                {statusText}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default LectureReviewSchedule;
