import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslations } from '../hooks/useTranslations';
import { TOOLS, ToolKey } from '../constants';
import { ChevronDoubleLeftIcon, SparklesIcon } from './icons';
import Logo from './common/Logo';

interface SidebarProps {
  activeTool: ToolKey;
  setActiveTool: (tool: ToolKey) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTool, setActiveTool, isSidebarCollapsed, setIsSidebarCollapsed }) => {
  const { userRole, setIsSubscriptionModalOpen, isAdmin } = useContext(AppContext);
  const { t } = useTranslations();

  const mainTools = Object.entries(TOOLS)
    .filter(([key]) => !['settings', 'planInformation', 'adminPanel'].includes(key) && !TOOLS[key as ToolKey].nameKey.includes('desc')) // Filter out static/admin pages
    .filter(([, config]) => config.role === userRole)
    .map(([key, config]) => ({ key: key as ToolKey, ...config }));

  const settingsTool = TOOLS['settings'] ? { key: 'settings' as ToolKey, ...TOOLS['settings'] } : null;
  const planTool = TOOLS['planInformation'] ? { key: 'planInformation' as ToolKey, ...TOOLS['planInformation'] } : null;
  const adminTool = isAdmin && TOOLS['adminPanel'] ? { key: 'adminPanel' as ToolKey, ...TOOLS['adminPanel'] } : null;


  const getToolItemClasses = (toolKey: ToolKey) => {
    const isActive = activeTool === toolKey;
    const baseButton = 'w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 group';
    const activeState = 'bg-indigo-100 dark:bg-white/20';
    const inactiveState = 'hover:bg-gray-500/10 dark:hover:bg-white/10';
    const layout = isSidebarCollapsed ? 'justify-center' : 'space-x-3';
    return `${baseButton} ${isActive ? activeState : inactiveState} ${layout}`;
  };

  const getIconClasses = (toolKey: ToolKey) => {
    const isActive = activeTool === toolKey;
    const baseIcon = 'flex-shrink-0 group-hover:text-gray-800 dark:group-hover:text-white transition-colors';
    const activeState = 'text-indigo-600 dark:text-white';
    const inactiveState = 'text-gray-500 dark:text-gray-300';
    return `${baseIcon} ${isActive ? activeState : inactiveState}`;
  };

  const getTextClasses = (toolKey: ToolKey) => {
    const isActive = activeTool === toolKey;
    const baseText = 'group-hover:text-gray-900 dark:group-hover:text-white transition-colors';
    const activeState = 'font-bold text-gray-900 dark:text-white';
    const inactiveState = 'text-sm font-medium text-gray-700 dark:text-gray-300';
    return `${baseText} ${isActive ? activeState : inactiveState}`;
  };

  return (
    <aside className={`fixed top-0 left-0 h-full glass-card hidden lg:flex flex-col m-4 rounded-3xl transition-all duration-300 ease-in-out z-20 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex items-center p-4 ${isSidebarCollapsed ? 'justify-center' : 'pl-4'} space-x-2 mb-6 h-16`}>
        <div className="bg-indigo-100 dark:bg-white/20 p-2 rounded-lg">
          <Logo className="h-8 w-8 text-indigo-600 dark:text-white" />
        </div>
        {!isSidebarCollapsed && <h1 className="text-2xl font-bold whitespace-nowrap text-gray-900 dark:text-white">EduSpark AI</h1>}
      </div>
      
      <nav className="flex-1 space-y-2 px-2">
          {!isSidebarCollapsed && <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">{t(userRole === 'student' ? 'forStudents' : 'forTeachers')}</h2>}
          <ul className="space-y-1">
            {mainTools.map(tool => (
              <li key={tool.key}>
                <button
                  onClick={() => setActiveTool(tool.key)}
                  title={isSidebarCollapsed ? t(tool.nameKey) : ''}
                  className={getToolItemClasses(tool.key)}
                >
                  <span className={getIconClasses(tool.key)}>{tool.icon}</span>
                  {!isSidebarCollapsed && <span className={getTextClasses(tool.key)}>{t(tool.nameKey)}</span>}
                </button>
              </li>
            ))}
          </ul>
      </nav>

      <div className="mt-auto p-2 pt-2 space-y-1">
         <div className="px-2">
            <button
                onClick={() => setIsSubscriptionModalOpen(true)}
                title={isSidebarCollapsed ? "Upgrade Plan" : ""}
                className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-300 bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90 hover:shadow-lg hover:shadow-indigo-500/50 ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'}`}
            >
                <SparklesIcon className="w-5 h-5"/>
                {!isSidebarCollapsed && <span className="text-sm font-bold">Upgrade Plan</span>}
            </button>
         </div>
         {adminTool && (
           <div>
              <button
                onClick={() => setActiveTool(adminTool.key)}
                title={isSidebarCollapsed ? t(adminTool.nameKey) : ''}
                className={getToolItemClasses(adminTool.key)}
              >
                <span className={getIconClasses(adminTool.key)}>{adminTool.icon}</span>
                {!isSidebarCollapsed && <span className={getTextClasses(adminTool.key)}>{t(adminTool.nameKey)}</span>}
              </button>
           </div>
        )}
         {planTool && (
           <div>
              <button
                onClick={() => setActiveTool(planTool.key)}
                title={isSidebarCollapsed ? t(planTool.nameKey) : ''}
                className={getToolItemClasses(planTool.key)}
              >
                <span className={getIconClasses(planTool.key)}>{planTool.icon}</span>
                {!isSidebarCollapsed && <span className={getTextClasses(planTool.key)}>{t(planTool.nameKey)}</span>}
              </button>
           </div>
        )}
         {settingsTool && (
           <div>
              <button
                onClick={() => setActiveTool(settingsTool.key)}
                title={isSidebarCollapsed ? t(settingsTool.nameKey) : ''}
                className={getToolItemClasses(settingsTool.key)}
              >
                <span className={getIconClasses(settingsTool.key)}>{settingsTool.icon}</span>
                {!isSidebarCollapsed && <span className={getTextClasses(settingsTool.key)}>{t(settingsTool.nameKey)}</span>}
              </button>
           </div>
        )}
        <div>
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-all duration-200 text-gray-500 dark:text-gray-300 hover:bg-gray-500/10 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white group ${isSidebarCollapsed ? 'justify-center' : 'space-x-3'}`}
            >
              <ChevronDoubleLeftIcon className={`w-6 h-6 transform transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
              {!isSidebarCollapsed && <span className="text-sm font-medium">Minimize</span>}
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;