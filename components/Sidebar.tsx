
import React from 'react';
import { AppView } from '../types';
import { ARABIC_STRINGS } from '../constants';
import { 
    HomeIcon, 
    BookOpenIconSmall, 
    ListBulletIcon, 
    CalendarDaysIcon, 
    ChartBarIcon, 
    SettingsIcon, 
    XMarkIcon,
    ClipboardListIcon, // Added
    IconSize, 
    ButtonIconSize 
} from './Icons'; 

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  appTitle: string;
  onNavigateToDashboard: () => void;
  onNavigateToSubjectsView: () => void; 
  onNavigateToTasksView: () => void;
  onNavigateToCalendarView: () => void;
  onNavigateToStatsView: () => void;
  onNavigateToDailyTasksView: () => void; // Added
  onOpenExportModal: () => void;
  onOpenSettingsModal: () => void;
  currentAppView: AppView;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  appTitle,
  onNavigateToDashboard,
  onNavigateToSubjectsView, 
  onNavigateToTasksView,
  onNavigateToCalendarView,
  onNavigateToStatsView,
  onNavigateToDailyTasksView, // Added
  onOpenExportModal,
  onOpenSettingsModal,
  currentAppView,
}) => {
  const navItemBaseClass = "flex items-center space-x-3 rtl:space-x-reverse px-4 py-3 rounded-lg transition-colors duration-200 ease-in-out";
  const navItemActiveClass = "bg-teal-500 text-white shadow-md";
  const navItemInactiveClass = "text-slate-700 dark:text-slate-200 hover:bg-teal-100/70 dark:hover:bg-teal-700/30";

  const NavLink: React.FC<{
    icon: React.ReactNode;
    text: string;
    onClick: () => void;
    isActive?: boolean;
  }> = ({ icon, text, onClick, isActive }) => (
    <button
      onClick={onClick}
      className={`${navItemBaseClass} ${isActive ? navItemActiveClass : navItemInactiveClass} w-full`}
    >
      {icon}
      <span className="font-medium">{text}</span>
    </button>
  );

  const actionButtonClass = "flex items-center justify-center space-x-2 rtl:space-x-reverse w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ease-in-out shadow hover:shadow-md";


  const navigationItems = [
    { id: 'dashboard', icon: <HomeIcon className={IconSize} />, text: ARABIC_STRINGS.DASHBOARD_TITLE, action: onNavigateToDashboard, views: ['dashboard' as AppView, 'subjectDetail' as AppView] },
    { id: 'subjects', icon: <BookOpenIconSmall className={IconSize} />, text: ARABIC_STRINGS.SUBJECTS_SECTION_TITLE, action: onNavigateToSubjectsView, views: ['dashboard'as AppView, 'subjectDetail' as AppView] }, // Points to dashboard
    { id: 'dailyTasks', icon: <ClipboardListIcon className={IconSize} />, text: ARABIC_STRINGS.DAILY_TASKS_PAGE_TITLE, action: onNavigateToDailyTasksView, views: ['dailyTasksView' as AppView] },
    { id: 'tasks', icon: <ListBulletIcon className={IconSize} />, text: ARABIC_STRINGS.SCHEDULED_TASKS_LINK, action: onNavigateToTasksView, views: ['tasksView' as AppView] },
    { id: 'calendar', icon: <CalendarDaysIcon className={IconSize} />, text: ARABIC_STRINGS.CALENDAR_LINK, action: onNavigateToCalendarView, views: ['calendarView' as AppView] },
    { id: 'stats', icon: <ChartBarIcon className={IconSize} />, text: ARABIC_STRINGS.STATISTICS_LINK, action: onNavigateToStatsView, views: ['statsView' as AppView] },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed top-0 right-0 h-full w-72 md:w-64 lg:w-72 bg-white dark:bg-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
        aria-label={ARABIC_STRINGS.MAIN_MENU}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400">{appTitle}</h2>
          <button
            onClick={onClose}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label={ARABIC_STRINGS.CLOSE_MENU}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation & Actions */}
        <div className="flex-grow p-4 space-y-6 overflow-y-auto">
          <nav className="space-y-2">
            <p className="px-4 pt-2 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{ARABIC_STRINGS.MAIN_MENU}</p>
            {navigationItems.map(item => (
              <NavLink 
                key={item.id} 
                icon={item.icon} 
                text={item.text} 
                onClick={item.action}
                isActive={item.views.includes(currentAppView)}
              />
            ))}
          </nav>

          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
             <p className="px-4 pb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{ARABIC_STRINGS.ACTIONS}</p>
            <button
              onClick={() => { onOpenExportModal(); if (window.innerWidth < 768) onClose(); }}
              className={`${actionButtonClass} bg-green-500 hover:bg-green-600 text-white`}
            >
              <CalendarDaysIcon className={IconSize} /> <span>{ARABIC_STRINGS.EXPORT_CALENDAR}</span>
            </button>
          </div>
        </div>

        {/* Footer: Settings */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <button
                onClick={() => { onOpenSettingsModal(); if (window.innerWidth < 768) onClose(); }}
                className={`${navItemBaseClass} ${navItemInactiveClass} w-full`} 
            >
                <SettingsIcon className={IconSize} />
                <span className="font-medium">{ARABIC_STRINGS.SETTINGS_TITLE}</span>
            </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;