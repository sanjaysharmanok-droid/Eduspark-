import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { ToolKey } from '../../constants';

const Footer: React.FC = () => {
    const { setActiveTool } = useContext(AppContext);
    
    const links: { key: ToolKey; label: string }[] = [
        { key: 'about', label: 'About Us' },
        { key: 'privacyPolicy', label: 'Privacy Policy' },
        { key: 'termsAndConditions', label: 'Terms & Conditions' },
        { key: 'contactUs', label: 'Contact Us' },
        { key: 'refundPolicy', label: 'Refund Policy' },
    ];

    return (
        <footer className="w-full text-center py-4 px-4">
            <div className="flex justify-center items-center flex-wrap gap-x-4 gap-y-2 sm:gap-x-6 text-sm">
                {links.map(link => (
                    <button 
                        key={link.key}
                        onClick={() => setActiveTool(link.key)}
                        className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                        {link.label}
                    </button>
                ))}
            </div>
            <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                &copy; {new Date().getFullYear()} EduSpark AI. All Rights Reserved.
            </p>
        </footer>
    );
};

export default Footer;