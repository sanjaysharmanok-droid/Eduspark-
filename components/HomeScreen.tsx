import React, { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslations } from '../hooks/useTranslations';
import { BookOpenIcon, AcademicCapIcon, GoogleIcon } from './icons';
import { TOOLS, ToolKey } from '../constants';
import { signInWithGoogle } from '../services/authService';
import Button from './common/Button';
import Logo from './common/Logo';

const HomeScreen: React.FC = () => {
  const { user, setUserRole, startGuestSession } = useContext(AppContext);
  const { t } = useTranslations();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      // The onAuthStateChanged listener in AppContext will handle setting the user.
    } catch (error) {
      console.error("Sign in failed from HomeScreen", error);
      // Optionally, show an error message to the user here.
    } finally {
      setIsSigningIn(false);
    }
  };

  const featuredToolKeys: ToolKey[] = [
    'homeworkHelper',
    'lessonPlanner',
    'topicExplorer',
    'quizGenerator',
    'presentationGenerator',
    'visualAssistant',
  ];
  const featuredTools = featuredToolKeys.map(key => ({ key, ...TOOLS[key] }));

  const renderAuthScreen = () => (
    <>
      <div className="relative z-10 text-center mb-12 max-w-4xl mx-auto">
        <Logo className="h-20 w-20 mx-auto mb-6 text-indigo-500 dark:text-indigo-400 animate-fade-in-up" />
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight animate-fade-in-up bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400" style={{ animationDelay: '0.1s' }}>
          {t('homeTitle')}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-200 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          Your AI-powered educational assistant. Please sign in to begin.
        </p>
      </div>
      <div className="relative z-10 w-full max-w-xs text-center animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
        <Button onClick={handleSignIn} isLoading={isSigningIn} className="w-full">
            <GoogleIcon className="w-6 h-6 mr-3" />
            Continue with Google
        </Button>
        <button
          onClick={startGuestSession}
          className="mt-6 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
        >
            Skip & Start as Guest
        </button>
      </div>
    </>
  );

  const renderRoleSelection = () => (
     <>
      <div className="relative z-10 text-center mb-12 max-w-4xl mx-auto">
        <Logo className="h-20 w-20 mx-auto mb-6 text-indigo-500 dark:text-indigo-400 animate-fade-in-up" />
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight animate-fade-in-up bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400" style={{ animationDelay: '0.1s' }}>
          Welcome, {user?.name}!
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-200 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          Please select your role to continue.
        </p>
      </div>
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <button
          onClick={() => setUserRole('student')}
          className="group relative p-8 glass-card rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-in-out text-left animate-fade-in-up"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="flex items-center space-x-6">
            <div className="bg-blue-100 dark:bg-blue-500/30 text-blue-600 dark:text-blue-300 p-4 rounded-xl">
              <BookOpenIcon className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">{t('student')}</h2>
              <p className="mt-1 text-gray-500 dark:text-gray-400">Access homework help, explore topics, and generate quizzes.</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => setUserRole('teacher')}
          className="group relative p-8 glass-card rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-in-out text-left animate-fade-in-up"
          style={{ animationDelay: '0.7s' }}
        >
           <div className="flex items-center space-x-6">
            <div className="bg-indigo-100 dark:bg-indigo-500/30 text-indigo-600 dark:text-indigo-300 p-4 rounded-xl">
                <AcademicCapIcon className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-500 dark:from-indigo-400 dark:to-violet-300">{t('teacher')}</h2>
              <p className="mt-1 text-gray-500 dark:text-gray-400">Plan lessons, create activities, and assist with report cards.</p>
            </div>
          </div>
        </button>
      </div>
     </>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden">
      
      {!user ? renderAuthScreen() : renderRoleSelection()}

       <div className="relative z-10 w-full max-w-4xl mt-16 animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
        <h3 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200 mb-6">Discover What's Possible</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 p-4">
          {featuredTools.map((tool) => (
            <div key={tool.key} className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-lg rounded-2xl p-4 text-center flex flex-col items-center justify-center space-y-2 aspect-square transform hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-default">
              <div className="text-indigo-600 dark:text-indigo-400">{React.cloneElement(tool.icon as React.ReactElement<{ className?: string }>, { className: "h-8 w-8" })}</div>
              <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{t(tool.nameKey)}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="relative z-10 mt-16 text-center text-sm text-gray-500 dark:text-gray-400 animate-fade-in-up" style={{ animationDelay: '1.1s' }}>
        <p>Made with ❤️ in India for the world.</p>
        <p className="mt-1">Powered by - Vinayak Shikshan Sansthan, Ankhisar</p>
      </div>
    </div>
  );
};

export default HomeScreen;