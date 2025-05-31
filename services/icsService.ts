
import { Review, Subject, Lecture } from '../types';
import { ARABIC_STRINGS } from '../constants';
import { format } from 'date-fns';

// Helper to format date for ICS (YYYYMMDD)
const formatDateForICS = (date: Date): string => {
  return format(date, 'yyyyMMdd');
};

// Helper to escape ICS special characters
const escapeICSString = (str: string): string => {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
};

export const generateICSContent = (
  reviewsToExport: Review[],
  subjects: Subject[],
  lectures: Lecture[]
): string => {
  if (!reviewsToExport.length) {
    return '';
  }

  const events = reviewsToExport.map(review => {
    const subject = subjects.find(s => s.id === review.subjectId);
    const lecture = lectures.find(l => l.id === review.lectureId);
    const summary = `${ARABIC_STRINGS.APP_TITLE}: ${subject ? escapeICSString(subject.name) : ''} - ${lecture ? escapeICSString(lecture.name) : ''}`;
    const description = `${ARABIC_STRINGS.TASKS_TABLE} ${ARABIC_STRINGS.FOR.toLocaleLowerCase()} ${subject ? escapeICSString(subject.name) : ''}, ${ARABIC_STRINGS.LECTURE_NAME.toLocaleLowerCase()}: ${lecture ? escapeICSString(lecture.name) : ''}.`;
    
    // DTSTAMP: The time the event was created. Use current time.
    const dtStamp = formatDateForICS(new Date()) + 'T' + format(new Date(), 'HHmmss') + 'Z';
    // DTSTART/DTEND: For all-day events, use DATE value.
    const dtStart = formatDateForICS(new Date(review.targetDate));
    const dtEnd = formatDateForICS(new Date(new Date(review.targetDate).getTime() + 24 * 60 * 60 * 1000)); // Next day for DTEND

    return [
      'BEGIN:VEVENT',
      `UID:${review.id}@${window.location.hostname || 'study-planner.app'}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`, // For an all-day event, DTEND is usually the next day.
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT'
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escapeICSString(ARABIC_STRINGS.APP_TITLE)}//NONSGML v1.0//EN`,
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
};