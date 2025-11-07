import React, { useState, useMemo, useContext, useEffect } from 'react';
import { AppContext } from './contexts/AppContext';
import Sidebar from './components/Sidebar';
import HomeScreen from './components/HomeScreen';
import { TOOLS, ToolKey, ToolConfig } from './constants';
import { useTranslations } from './hooks/useTranslations';
import SubscriptionModal from './components/common/SubscriptionModal';
import BottomNavBar from './components/common/BottomNavBar';
import Footer from './components/common/Footer';
import Logo from './components/common/Logo';
import Button from './components/common/Button';
import AdminRoleSelector from './components/common/AdminRoleSelector';
import Spinner from './components/common/Spinner';
import AdminControls from './components/common/AdminControls';

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
const AdminPanel = React.lazy(() => import('./components/features/AdminPanel'));

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

// Header for the dedicated Admin view
const AdminHeader: React.FC = () => {
    const { user, signOut, setAdminViewMode } = useContext(AppContext);
    return (
        <header className="w-full p-4 glass-card flex justify-between items-center lg:m-4 lg:mb-6 lg:rounded-2xl shadow-lg">
            <div className="flex items-center space-x-3">
                <Logo className="h-10 w-10 text-indigo-500 dark:text-indigo-400" />
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
                 <Button onClick={() => setAdminViewMode('user')} className="text-sm px-4 py-2">
                    Switch to User View
                </Button>
                {user && (
                    <div className="flex items-center space-x-2">
                        <img src={user.picture} alt={user.name} className="h-10 w-10 rounded-full"/>
                        <button onClick={signOut} className="text-sm font-medium text-gray-600 hover:text-indigo-500 dark:text-gray-300 dark:hover:text-indigo-400 hidden sm:block">Sign Out</button>
                    </div>
                )}
            </div>
        </header>
    );
};

const App: React.FC = () => {
  const { 
      user, 
      userRole, 
      activeTool, 
      setActiveTool, 
      isAdmin, 
      adminViewMode, 
      isAdminViewSelected, 
      authLoading, // Use loading states from context
      dataLoading  // Use loading states from context
  } = useContext(AppContext);
  const { t } = useTranslations();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isMobile = useMediaQuery('(max-width: 1023px)');

  const infoPageKeys: ToolKey[] = ['about', 'privacyPolicy', 'termsAndConditions', 'contactUs', 'refundPolicy'];
  const isInfoPage = infoPageKeys.includes(activeTool);
  
  const isVisualAssistantActive = activeTool === 'visualAssistant' || activeTool === 'visualAssistantTeacher';

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
      case 'adminPanel': return <AdminPanel />;
      default: return <LessonPlanner />;
    }
  }, [activeTool]);
  
  const activeToolDetails = TOOLS[activeTool as keyof typeof TOOLS] as ToolConfig;

  // NEW: Centralized Loading State to prevent race conditions
  if (authLoading || dataLoading) {
      return (
          <div className="flex justify-center items-center h-screen bg-transparent">
              <Spinner />
          </div>
      );
  }

  // Allow viewing info pages even when logged out
  if (isInfoPage && !user) {
    return (
      <div className="h-screen bg-transparent font-sans text-gray-800 dark:text-gray-200 flex flex-col">
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
             <div className="flex justify-start mb-6">
               <a href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  &larr; Back to Home
               </a>
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

  // 1. User is not logged in. Show the main login screen.
  if (!user) {
    return <HomeScreen />;
  }

  // 2. User is logged in. Check if they are an admin.
  if (isAdmin) {
      // 2a. If admin hasn't chosen a view, OR was in user-view and clicked 'Change Role',
      // show the full admin role selector. This prevents admins from getting stuck.
      if (!isAdminViewSelected || (adminViewMode === 'user' && !userRole)) {
          return <AdminRoleSelector />;
      }
      
      // 2b. Admin has selected the "Admin Dashboard" view.
      if (adminViewMode === 'admin') {
          return (
            <>
                <SubscriptionModal />
                <div className="h-screen bg-transparent font-sans text-gray-800 dark:text-gray-200 flex flex-col">
                    <AdminHeader />
                    <main className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 lg:px-8 pb-8">
                         <React.Suspense fallback={<div className="text-center p-8 text-gray-600 dark:text-white/80">Loading Admin Panel...</div>}>
                            <AdminPanel />
                        </React.Suspense>
                    </main>
                </div>
            </>
          );
      }
      // 2c. If admin selected 'user' view AND has a role, the logic will fall through.
  }

  // 3. User is a regular user (or an admin who has selected a user view) and has not chosen a role.
  // This screen is for first-time non-admin users.
  if (!userRole) {
    return <HomeScreen />;
  }

  // 4. Main App View for Students, Teachers, and Admins in User View.
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
                          <p className="text-gray-500 dark:text-gray-400">{t(activeToolDetails.descriptionKey)}</p>
                      </div>
                  </div>
              </div>
           )}
            <React.Suspense fallback={<div className="flex justify-center p-8"><Spinner /></div>}>
              {activeComponent}
            </React.Suspense>
        </div>
      </main>
    </div>
    {isMobile && !isVisualAssistantActive && <BottomNavBar />}
    {isAdmin && adminViewMode === 'user' && <AdminControls />}
    </>
  );
};

export default App;