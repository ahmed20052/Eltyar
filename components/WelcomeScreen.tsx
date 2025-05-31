
import React, { useMemo } from 'react';
import { ARABIC_STRINGS, MOTIVATIONAL_QUOTES } from '../constants';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const randomQuote = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[randomIndex];
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-sky-500 to-indigo-600 dark:from-sky-700 dark:to-indigo-800 p-8 text-white text-center transition-opacity duration-500 ease-in-out">
      <div className="max-w-xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg">
          {ARABIC_STRINGS.WELCOME_TITLE}
        </h1>
        <blockquote className="mb-10 text-lg md:text-xl italic bg-white/10 dark:bg-black/20 p-6 rounded-lg shadow-md backdrop-blur-sm">
          <p>"{randomQuote.text}"</p>
        </blockquote>
        <button
          onClick={onStart}
          className="bg-white text-sky-600 dark:bg-slate-800 dark:text-sky-400 font-bold py-3 px-8 rounded-lg text-lg shadow-xl hover:bg-slate-100 dark:hover:bg-slate-700 transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-sky-300 dark:focus:ring-sky-600"
        >
          {ARABIC_STRINGS.WELCOME_BUTTON}
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
