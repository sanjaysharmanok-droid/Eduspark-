import React, { useState, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useTranslations } from '../../hooks/useTranslations';
import { TOOLS, ToolKey } from '../../constants';
import { EllipsisHorizontalIcon, SparklesIcon } from '../icons';

const BottomNavBar: React.FC = () => {
    const { userRole, activeTool, setActiveTool, subscriptionTier, credits, setIsSubscriptionModalOpen } = useContext(AppContext);
    const { t } = useTranslations();
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    // Define primary and secondary tools for each role
    const studentPrimary = ['homeworkHelper', 'topicExplorer', 'summarizer'];
    const studentSecondary = ['factFinder', 'visualAssistant', 'quizGenerator', 'myLibrary', 'myReports', 'settings'];
    
    const teacherPrimary = ['lessonPlanner', 'activityGenerator', 'summarizerTeacher'];
    const teacherSecondary = ['presentationGenerator', 'reportCardHelper', 'quizGeneratorTeacher', 'visualAssistantTeacher', 'settings'];
    
    const primaryTools = userRole === 'student' ? studentPrimary : teacherPrimary;
    const secondaryTools = userRole === 'student' ? studentSecondary : teacherSecondary;

    const navItems = primaryTools.map(key => ({ key, ...TOOLS[key as ToolKey] }));
    const moreMenuItems = secondaryTools.map(key => ({ key, ...TOOLS[key as ToolKey] }));

    const handleSelectTool = (toolKey: ToolKey) => {
        setActiveTool(toolKey);
        setIsMoreMenuOpen(false);
    };
    
    const NavButton: React.FC<{item: any, isActive: boolean}> = ({ item, isActive }) => (
         <button 
            key={item.key} 
            onClick={() => setActiveTool(item.key as ToolKey)} 
            className="flex flex-col items-center justify-center text-center p-2 rounded-lg w-24 h-full transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-current={isActive ? 'page' : undefined}
        >
            <div className={`relative transition-all duration-300 ${isActive ? '-translate-y-2' : ''}`}>
              <span className={`flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-300 ${isActive ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50' : 'bg-gray-500/10'}`}>
                  {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: `h-6 w-6 transition-colors duration-200 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-300'}` })}
              </span>
            </div>
            <span className={`text-xs mt-1 font-medium transition-all duration-300 ${isActive ? 'opacity-100 text-gray-800 dark:text-white' : 'opacity-0'}`}>
                {t(item.nameKey)}
            </span>
        </button>
    );

    return (
        <>
            {/* Backdrop for the "More" menu */}
            {isMoreMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" 
                    onClick={() => setIsMoreMenuOpen(false)}
                />
            )}

            {/* "More" menu panel */}
            <div className={`fixed bottom-28 left-2 right-2 p-4 glass-card rounded-2xl z-40 transition-transform duration-300 ease-in-out ${isMoreMenuOpen ? 'translate-y-0' : 'translate-y-[150%]'}`}>
                <div className="p-3 mb-4 text-center rounded-lg bg-black/5 dark:bg-black/10">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white capitalize">{subscriptionTier} Plan</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{credits} Credits Remaining</p>
                    {subscriptionTier !== 'gold' && (
                        <button
                            onClick={() => {
                                setIsSubscriptionModalOpen(true);
                                setIsMoreMenuOpen(false); // Close the panel
                            }}
                            className="w-full flex items-center justify-center mt-2 p-2 rounded-lg text-left transition-all duration-300 bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90 hover:shadow-lg hover:shadow-indigo-500/50 space-x-2"
                        >
                            <SparklesIcon className="w-5 h-5"/>
                            <span className="text-sm font-bold">Upgrade</span>
                        </button>
                    )}
                </div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">More Tools</h3>
                <ul className="grid grid-cols-2 gap-2">
                    {moreMenuItems.map(item => (
                        <li key={item.key}>
                            <button
                                onClick={() => handleSelectTool(item.key as ToolKey)}
                                className="w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 group hover:bg-gray-500/10 dark:hover:bg-white/10"
                            >
                                <span className="p-2 bg-gray-500/10 rounded-lg mr-4">{item.icon}</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{t(item.nameKey)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            
            <footer className="lg:hidden fixed bottom-0 left-0 right-0 m-2 mb-4 z-20">
                <div className="glass-card rounded-2xl">
                    <nav className="flex justify-around items-center h-20 px-2">
                        {navItems.map(item => (
                             <NavButton key={item.key} item={item} isActive={activeTool === item.key} />
                        ))}
                        {/* More Button */}
                         <button 
                            key="more-button"
                            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                            className="flex flex-col items-center justify-center text-center p-2 rounded-lg w-24 h-full transition-colors duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            aria-expanded={isMoreMenuOpen}
                        >
                            <div className={`relative transition-all duration-300 ${isMoreMenuOpen ? '-translate-y-2' : ''}`}>
                                <span className={`flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-300 ${isMoreMenuOpen ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50' : 'bg-gray-500/10'}`}>
                                    <EllipsisHorizontalIcon className={`h-6 w-6 transition-colors duration-200 ${isMoreMenuOpen ? 'text-white' : 'text-gray-500 dark:text-gray-300'}`} />
                                </span>
                            </div>
                            <span className={`text-xs mt-1 font-medium transition-all duration-300 ${isMoreMenuOpen ? 'opacity-100 text-gray-800 dark:text-white' : 'opacity-0'}`}>
                                More
                            </span>
                        </button>
                    </nav>
                </div>
            </footer>
        </>
    );
};

export default BottomNavBar;