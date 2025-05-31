
import React, { useState, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Added xl
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const [isActuallyOpen, setIsActuallyOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsActuallyOpen(true);
    } else {
      // Allow animation to complete before removing from DOM
      const timer = setTimeout(() => setIsActuallyOpen(false), 300); // Matches animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  if (!isActuallyOpen && !isOpen) return null; // Don't render if not open and animation has finished

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div 
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100 bg-black/60 dark:bg-black/75 backdrop-blur-sm' : 'opacity-0'}`}
        onClick={isOpen ? onClose : undefined} // Only allow close if fully open
        aria-modal="true"
        role="dialog"
    >
      <div 
        className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 m-4 ${sizeClasses[size]} w-full transform transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 scale-100 animate-subtlePopIn' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
          <h3 className="text-xl font-bold text-teal-700 dark:text-teal-400">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="إغلاق"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div> {/* Removed mt-4, mb-4 on title takes care of top spacing */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;