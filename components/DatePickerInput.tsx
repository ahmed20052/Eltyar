
import React from 'react';

interface DatePickerInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  label?: string;
  min?: string;
  required?: boolean;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({ value, onChange, id, label, min, required }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
      <input
        type="date"
        id={id}
        value={value}
        onChange={onChange}
        min={min}
        required={required}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 dark:placeholder-slate-400"
      />
    </div>
  );
};

export default DatePickerInput;
