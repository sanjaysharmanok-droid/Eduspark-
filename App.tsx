import React, { useState, useMemo, useContext } from 'react';
import { AppContext } from './contexts/AppContext';
import Sidebar from './components/Sidebar';
import HomeScreen from './components/HomeScreen';
import { TOOLS, ToolKey, ToolConfig } from './constants';
import { useTranslations } from './hooks/useTranslations';
import SubscriptionModal from './components/common/SubscriptionModal';

// Dynamically import feature components
const LessonPlanner = React.lazy(() => import('./components/features/LessonPlanner'));
const HomeworkHelper = React.lazy(() => import('./components/features/HomeworkHelper'));
const TopicExplorer = React.lazy(() => import('./components/features/TopicExplorer'));
const ActivityGenerator = React.lazy(() => import('./components/features/ActivityGenerator'));
const QuizGenerator = React.lazy(() => import('./components/features/QuizGenerator'));
const ReportCardHelper = React.lazy(() => import('./components/features/ReportCardHelper'));
const PresentationGenerator = React.lazy(() => import('./components/features/PresentationGenerator'));
const VisualAssistant = React.lazy(() => import('./components/features/VisualAssistant'));
const Settings = React.lazy(() => import('./components/features/Settings'));
const MyLibrary = React.lazy(() => import('./components/features/MyLibrary'));
const MyReports = React.lazy(() => import('./components/features/MyReports'));


const App: React.FC = () => {
  const { user, userRole, activeTool, setActiveTool } = useContext(AppContext);
  const { t } = useTranslations();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const activeComponent = useMemo(() => {
    switch (activeTool) {
      case 'lessonPlanner': return <LessonPlanner />;
      case 'homeworkHelper': return <HomeworkHelper />;
      case 'topicExplorer': return <TopicExplorer />;
      case 'activityGenerator': return <ActivityGenerator />;
      case 'presentationGenerator': return <PresentationGenerator />;
      case 'quizGenerator': 
      case 'quizGeneratorTeacher':
        return <QuizGenerator />;
      case 'reportCardHelper': return <ReportCardHelper />;
      case 'visualAssistant': 
      case 'visualAssistantTeacher':
        return <VisualAssistant />;
      case 'settings': return <Settings />;
      case 'myLibrary': return <MyLibrary />;
      case 'myReports': return <MyReports />;
      default: return <LessonPlanner />;
    }
  }, [activeTool]);
  
  const activeToolDetails = TOOLS[activeTool] as ToolConfig;

  if (!user || !userRole) {
    return <HomeScreen />;
  }

  return (
    <>
    <SubscriptionModal />
    <div className="flex h-screen bg-transparent font-sans text-gray-800 dark:text-gray-200">
      <Sidebar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
      <main className={`flex-1 overflow-y-auto scrollbar-thin transition-all duration-300 ${isSidebarCollapsed ? 'pl-24' : 'pl-72'}`}>
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
           <div className="glass-card p-6 rounded-2xl shadow-lg mb-6">
              <div className="flex items-center space-x-4">
                  <div className="bg-indigo-100 dark:bg-white/20 p-3 rounded-xl">
                      {/* FIX: Add type assertion to fix cloneElement typing issue where the generic element type did not specify a className prop. */}
                      {React.cloneElement(activeToolDetails.icon as React.ReactElement<{ className?: string }>, { className: 'h-8 w-8 text-indigo-600 dark:text-white' })}
                  </div>
                  <div>
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t(activeToolDetails.nameKey)}</h1>
                      <p className="text-gray-600 dark:text-gray-300">{t(activeToolDetails.descriptionKey)}</p>
                  </div>
              </div>
          </div>
          <React.Suspense fallback={<div className="text-center p-8 text-gray-600 dark:text-white/80">Loading Tool...</div>}>
            {activeComponent}
          </React.Suspense>
        </div>
      </main>
    </div>
    </>
  );
};

export default App;