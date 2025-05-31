
import React, { useState } from 'react';
import { Review } from '../types';
import { ARABIC_STRINGS } from '../constants';
import {
  format,
  addMonths,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  getDate as getDayOfMonth,
  addDays,
} from 'date-fns';
import subMonths from 'date-fns/subMonths';
import startOfMonth from 'date-fns/startOfMonth';
import startOfWeek from 'date-fns/startOfWeek';
import { arSA } from 'date-fns/locale/ar-SA';

interface InlineCalendarProps {
  reviews: Review[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date | null;
  highlightedDays: string[]; // Array of ISO date strings 'yyyy-MM-dd'
}

const InlineCalendar: React.FC<InlineCalendarProps> = ({ reviews, onDateSelect, selectedDate, highlightedDays }) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { locale: arSA });
  const calendarEnd = endOfWeek(monthEnd, { locale: arSA });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const dayNames = [];
  const firstDayOfWeek = startOfWeek(new Date(), { locale: arSA });
  for (let i = 0; i < 7; i++) {
    dayNames.push(format(addDays(firstDayOfWeek, i), 'EEEEEE', { locale: arSA }));
  }


  return (
    <div className="p-4 bg-white dark:bg-slate-800/70 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          aria-label={ARABIC_STRINGS.PREVIOUS_MONTH}
          className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        <h3 className="text-xl font-semibold text-teal-700 dark:text-teal-400">
          {format(currentMonth, 'MMMM yyyy', { locale: arSA })}
        </h3>
        <button
          onClick={nextMonth}
          aria-label={ARABIC_STRINGS.NEXT_MONTH}
          className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-sm text-slate-600 dark:text-slate-400 mb-2">
        {dayNames.map(dayName => (
          <div key={dayName} className="font-medium p-2">{dayName}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {days.map((day) => {
          const dayISO = format(day, 'yyyy-MM-dd');
          const isCurrentMonthDay = isSameMonth(day, currentMonth);
          const isSelectedDay = selectedDate ? isSameDay(day, selectedDate) : false;
          const isTodayDay = isToday(day);
          const hasReview = highlightedDays.includes(dayISO);

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              disabled={!isCurrentMonthDay}
              aria-label={`${format(day, 'PPP', { locale: arSA })} ${hasReview ? '(عليه مراجعات)' : ''}`}
              className={`
                p-2 h-14 w-full flex flex-col items-center justify-center rounded-lg transition-all duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-teal-400 dark:focus:ring-teal-500 focus:z-10 transform hover:scale-105
                ${isCurrentMonthDay 
                    ? 'hover:bg-teal-50 dark:hover:bg-teal-800/30 cursor-pointer' 
                    : 'text-slate-400 dark:text-slate-600 cursor-default bg-slate-50 dark:bg-slate-800/20'}
                ${isSelectedDay 
                    ? 'bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700 shadow-lg scale-105' 
                    : ''}
                ${!isSelectedDay && isTodayDay && isCurrentMonthDay 
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-700/40 dark:text-sky-300 font-semibold' 
                    : ''}
                ${!isSelectedDay && !isTodayDay && isCurrentMonthDay 
                    ? 'text-slate-700 dark:text-slate-300' 
                    : ''}
              `}
            >
              <span className="text-base">{getDayOfMonth(day)}</span>
              {hasReview && isCurrentMonthDay && !isSelectedDay && (
                <span className="block w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full mt-1"></span>
              )}
               {hasReview && isCurrentMonthDay && isSelectedDay && (
                <span className="block w-2 h-2 bg-white rounded-full mt-1"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InlineCalendar;