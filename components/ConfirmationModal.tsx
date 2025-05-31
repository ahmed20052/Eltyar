
import React from 'react';
import Modal from './Modal';
import { ARABIC_STRINGS } from '../constants';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  const buttonPrimaryClass = "font-semibold py-2.5 px-5 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-lg active:scale-[0.97] active:shadow-inner flex items-center justify-center";
  const buttonSecondaryClass = `${buttonPrimaryClass} text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600`;
  const buttonDangerClass = `${buttonPrimaryClass} text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-slate-600 dark:text-slate-300 mb-6 text-base">{message}</p>
      <div className="flex justify-end space-x-3 space-x-reverse">
        <button
          onClick={onClose}
          className={buttonSecondaryClass}
        >
          {ARABIC_STRINGS.NO}
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={buttonDangerClass}
        >
          {ARABIC_STRINGS.YES}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;