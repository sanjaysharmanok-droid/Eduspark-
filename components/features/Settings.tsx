import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useTranslations } from '../../hooks/useTranslations';
import Card from '../common/Card';
import Button from '../common/Button';
import { Language, Theme } from '../../types';
import Select from '../common/Select';

const Settings: React.FC = () => {
  const { 
    user, 
    signOut, 
    userRole, 
    setUserRole,
    theme,
    toggleTheme,
    language,
    setLanguage
  } = useContext(AppContext);
  const { t } = useTranslations();

  const handleChangeRole = () => {
    setUserRole(null);
  };

  const isGuest = user?.email === 'guest@eduspark.ai';

  return (
    <div className="space-y-6">
       <Card title="Profile & Account">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            {user?.picture ? (
                 <img src={user.picture} alt={user.name} className="h-16 w-16 rounded-full border-2 border-indigo-400" />
            ) : (
                <div className="h-16 w-16 rounded-full border-2 border-indigo-400 bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-500 dark:text-gray-400">{user?.name.charAt(0)}</span>
                </div>
            )}
            <div className="text-gray-900 dark:text-white">
                <p className="font-semibold text-xl">{user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{isGuest ? 'Guest Account' : user?.email}</p>
            </div>
          </div>
          <Button onClick={signOut} className="w-full sm:w-auto focus:ring-red-500 from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 hover:shadow-rose-500/50">
              {isGuest ? 'Login / Sign Up' : 'Sign Out'}
          </Button>
        </div>
      </Card>

      <Card title="Preferences">
        <div className="space-y-6">
           <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current Role</label>
            <div className="flex items-center justify-between">
              <p className="text-lg text-gray-900 dark:text-white capitalize">{userRole}</p>
              <Button onClick={handleChangeRole} className="text-sm px-4 py-2">
                Change Role
              </Button>
            </div>
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Changing your role will take you back to the selection screen.
            </p>
          </div>
          
          <div className="border-t border-gray-200 dark:border-white/10"></div>

          <div>
             <Select 
                label={t('language')}
                id="language-select" 
                value={language} 
                onChange={e => setLanguage(e.target.value as Language)}
              >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="es">Español (Spanish)</option>
                  <option value="fr">Français (French)</option>
              </Select>
          </div>
          
          <div className="border-t border-gray-200 dark:border-white/10"></div>
          
          <div className="flex justify-between items-center">
             <label htmlFor="theme-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('theme')}</label>
             <button
                id="theme-toggle"
                type="button"
                role="switch"
                aria-checked={theme === 'dark'}
                onClick={toggleTheme}
                className={`${theme === 'dark' ? 'bg-indigo-500' : 'bg-gray-300'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-indigo-500`}
            >
                <span className={`${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;