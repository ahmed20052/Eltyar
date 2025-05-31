import React from 'react';
import { Theme } from '../types';
import { ARABIC_STRINGS } from '../constants';
import { SunIcon, MoonIcon, DesktopIcon } from '@/components/Icons'; // Changed from './Icons'

interface ThemeToggleProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ currentTheme, onThemeChange }) => {
  const themes: { name: Theme; label: string; icon: JSX.Element }[] = [
    { name: 'light', label: ARABIC_STRINGS.THEME_LIGHT, icon: <SunIcon /> },
    { name: 'dark', label: ARABIC_STRINGS.THEME_DARK, icon: <MoonIcon /> },
    { name: 'system', label: ARABIC_STRINGS.THEME_SYSTEM, icon: <DesktopIcon /> },
  ];

  return (
    <div className="flex space-x-1 rtl:space-x-reverse p-1 bg-slate-200 dark:bg-slate-700 rounded-lg">
      {themes.map((theme) => (
        <button
          key={theme.name}
          onClick={() => onThemeChange(theme.name)}
          title={theme.label}
          className={`flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors
            ${currentTheme === theme.name
              ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-slate-600/50'
            }`}
        >
          {theme.icon}
          <span className="hidden sm:inline sm:ml-2 rtl:sm:mr-2">{theme.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;