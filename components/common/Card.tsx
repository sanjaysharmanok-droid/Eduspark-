import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`glass-card rounded-2xl shadow-lg p-6 ${className}`}>
        {title && <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{title}</h3>}
        {children}
    </div>
  );
};

export default Card;
