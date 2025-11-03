import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { useTranslations } from '../hooks/useTranslations';
import { BookOpenIcon, AcademicCapIcon } from './icons';
import { TOOLS } from '../constants';
import { CLIENT_ID, decodeJwtResponse } from '../services/googleAuthService';
import { User } from '../types';

// Inform TypeScript about the global 'google' object from the GSI script
declare const google: any;

const HomeScreen: React.FC = () => {
  const { user, setUser, setUserRole, theme } = useContext(AppContext);
  const { t } = useTranslations();

  useEffect(() => {
    // If user is already signed in, or the google script isn't loaded, do nothing.
    if (user || typeof google === 'undefined') {
      return;
    }

    const handleCredentialResponse = (response: any) => {
        console.log('Google Sign-In successful, handling callback...');
        const userData = decodeJwtResponse(response.credential);
        if (userData) {
            const appUser: User = {
                name: userData.name,
                email: userData.email,
                picture: userData.picture,
            };
            setUser(appUser);
        } else {
            console.error("Failed to decode user data from token.");
        }
    };

    google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredentialResponse,
      use_fedcm_for_prompt: false,
    });

    const signInButtonContainer = document.getElementById('google-signin-button');
    if (signInButtonContainer) {
        google.accounts.id.renderButton(
          signInButtonContainer,
          { theme: theme === 'dark' ? 'filled_black' : 'outline', size: 'large', type: 'standard', shape: 'pill', text: 'continue_with' }
        );
    }

  }, [user, setUser, theme]);

  const toolArray = Object.values(TOOLS);

  const renderAuthScreen = () => (
    <>
      <div className="relative z-10 text-center mb-12 max-w-4xl mx-auto">
        <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight animate-fade-in-up bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400" style={{ animationDelay: '0.1s' }}>
          {t('homeTitle')}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-200 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          Your AI-powered educational assistant. Please sign in to begin.
        </p>
      </div>
      <div className="relative z-10 w-full max-w-xs animate-fade-in-up flex justify-center" style={{ animationDelay: '0.5s' }}>
        <div id="google-signin-button"></div>
      </div>
    </>
  );

  const renderRoleSelection = () => (
     <>
      <div className="relative z-10 text-center mb-12 max-w-4xl mx-auto">
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

       <div className="relative z-10 w-full max-w-6xl mt-16 animate-fade-in-up" style={{ animationDelay: '0.9s' }}>
        <h3 className="text-xl font-bold text-center text-gray-800 dark:text-gray-200 mb-6">Explore Our Tools</h3>
        <div className="flex overflow-x-auto space-x-4 p-4 scrollbar-thin">
          {toolArray.map((tool, index) => (
            <div key={index} className="flex-shrink-0 w-48 glass-card rounded-xl p-4 text-center flex flex-col items-center justify-center space-y-2">
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
