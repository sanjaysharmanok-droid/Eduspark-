import React from 'react';

export const Logo: React.FC<{className?: string}> = ({className = "h-8 w-8"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        {/* Central nucleus/spark */}
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        {/* Electron orbits forming a spark-like shape */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" opacity="0.4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 00-12.728 12.728" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 0112.728 12.728" />
    </svg>
);

export default Logo;
