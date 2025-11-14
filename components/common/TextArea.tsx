import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

const TextArea: React.FC<TextAreaProps> = ({ label, id, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        {label}
      </label>
      <textarea
        id={id}
        rows={4}
        className="block w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg shadow-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/60 dark:bg-slate-700/40 text-gray-900 dark:text-white sm:text-sm transition-all duration-200"
        {...props}
      ></textarea>
    </div>
  );
};

export default TextArea;
