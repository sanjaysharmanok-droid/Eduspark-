import React, { useState, useMemo, useContext, useEffect } from 'react';
import { AppContext } from './contexts/AppContext';
import Sidebar from './components/Sidebar';
import HomeScreen from './components/HomeScreen';
import { TOOLS, ToolKey, ToolConfig } from './constants';
import { useTranslations } from './hooks/useTranslations';
import SubscriptionModal from './components/common/SubscriptionModal';
import BottomNavBar from './components/common/BottomNavBar';
import Footer from './components/common/Footer';

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
const FactFinder = React.lazy(() => import('./components/features/FactFinder'));
const Summarizer = React.lazy(() => import('./components/features/Summarizer'));
const PlanInformation = React.lazy(() => import('./components/features/PlanInformation'));
const AboutPage = React.lazy(() => import('./components/features/AboutPage'));
const PrivacyPolicyPage = React.lazy(() => import('./components/features/PrivacyPolicyPage'));
const TermsAndConditionsPage = React.lazy(() => import('./components/features/TermsAndConditionsPage'));
const ContactUsPage = React.lazy(() => import('./components/features/ContactUsPage'));
const RefundPolicyPage = React.lazy(() => import('./components/features/RefundPolicyPage'));

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};


const App: React.FC = () => {
  const { user, userRole, activeTool, setActiveTool } = useContext(AppContext);
  const { t } = useTranslations();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const isVisualAssistantActive = activeTool === 'visualAssistant' || activeTool === 'visualAssistantTeacher';
  const isInfoPage = ['about', 'privacyPolicy', 'termsAndConditions', 'contactUs', 'refundPolicy'].includes(activeTool);

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
      case 'factFinder': return <FactFinder />;
      case 'summarizer':
      case 'summarizerTeacher':
        return <Summarizer />;
      case 'planInformation': return <PlanInformation />;
      case 'about': return <AboutPage />;
      case 'privacyPolicy': return <PrivacyPolicyPage />;
      case 'termsAndConditions': return <TermsAndConditionsPage />;
      case 'contactUs': return <ContactUsPage />;
      case 'refundPolicy': return <RefundPolicyPage />;
      default: return <LessonPlanner />;
    }
  }, [activeTool]);
  
  const activeToolDetails = TOOLS[activeTool] as ToolConfig;

  // If user is not logged in AND not trying to view an info page, show home screen.
  if ((!user || !userRole) && !isInfoPage) {
    return <HomeScreen />;
  }
  
  // Minimal layout for unauthenticated users viewing info pages.
  if (isInfoPage && (!user || !userRole)) {
      return (
        <div className="h-screen bg-transparent font-sans text-gray-800 dark:text-gray-200 flex flex-col">
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
               <div className="flex justify-start mb-6">
                 <button onClick={() => setActiveTool('lessonPlanner')} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    &larr; Back to Home
                 </button>
               </div>
              <React.Suspense fallback={<div className="text-center p-8">Loading...</div>}>
                {activeComponent}
              </React.Suspense>
            </div>
          </main>
          <Footer />
        </div>
      );
  }
  
  const mainContentContainerClasses = isVisualAssistantActive
    ? "h-full w-full" 
    : "max-w-5xl mx-auto p-4 sm:p-6 lg:p-8";

  return (
    <>
    <SubscriptionModal />
    <div className={`h-screen bg-transparent font-sans text-gray-800 dark:text-gray-200 ${!isVisualAssistantActive && 'flex'}`}>
      {!isVisualAssistantActive && <Sidebar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />}
      <main className={`flex-1 flex flex-col overflow-y-auto scrollbar-thin transition-all duration-300 ${isVisualAssistantActive ? '' : (isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-72')} ${!isVisualAssistantActive && 'pb-24 lg:pb-0'}`}>
        <div className={`flex-grow w-full ${mainContentContainerClasses}`}>
           {!(isVisualAssistantActive) && activeToolDetails && (
              <div className="glass-card p-6 rounded-2xl shadow-lg mb-6">
                  <div className="flex items-center space-x-4">
                      <div className="bg-indigo-100 dark:bg-white/20 p-3 rounded-xl">
                          {React.cloneElement(activeToolDetails.icon as React.ReactElement<{ className?: string }>, { className: 'h-8 w-8 text-indigo-600 dark:text-white' })}
                      </div>
                      <div>
                          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t(activeToolDetails.nameKey)}</h1>
                          <p className="text-gray-600 dark:text-gray-300">{t(activeToolDetails.descriptionKey)}</p>
                      </div>
                  </div>
              </div>
            )}
          <React.Suspense fallback={<div className="text-center p-8 text-gray-600 dark:text-white/80">Loading Tool...</div>}>
            {activeComponent}
          </React.Suspense>
        </div>
      </main>
      {!isVisualAssistantActive && <BottomNavBar />}
    </div>
    </>
  );
};

export default App;