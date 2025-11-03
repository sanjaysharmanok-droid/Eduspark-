import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ label, id, children, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        {label}
      </label>
      <select
        id={id}
        className="block w-full pl-4 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-white/60 dark:bg-slate-700/40 text-gray-900 dark:text-white transition-all duration-200"
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

export default Select;