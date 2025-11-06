import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useTranslations } from '../../hooks/useTranslations';
import Card from '../common/Card';
import Button from '../common/Button';
import { Language, Theme } from '../../types';
import Select from '../common/Select';
import { ToolKey } from '../../constants';
import { ChevronRightIcon } from '../icons';

const Settings: React.FC = () => {
  const { 
    user, 
    signOut, 
    userRole, 
    setUserRole,
    language,
    setLanguage,
    setActiveTool
  } = useContext(AppContext);
  const { t } = useTranslations();

  const handleChangeRole = () => {
    setUserRole(null);
  };

  const isGuest = user?.email === 'guest@eduspark.ai';
  
  const infoLinks: { key: ToolKey; label: string }[] = [
    { key: 'about', label: 'About Us' },
    { key: 'privacyPolicy', label: 'Privacy Policy' },
    { key: 'termsAndConditions', label: 'Terms & Conditions' },
    { key: 'contactUs', label: 'Contact Us' },
    { key: 'refundPolicy', label: 'Refund Policy' },
  ];

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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('theme')}</label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('systemTheme_info')}
            </p>
          </div>
        </div>
      </Card>
      
      <Card title="Information & Support">
          <div className="divide-y divide-gray-200 dark:divide-white/10">
              {infoLinks.map(link => (
                  <button 
                      key={link.key} 
                      onClick={() => setActiveTool(link.key)}
                      className="w-full text-left py-4 flex justify-between items-center group"
                      aria-label={`Navigate to ${link.label}`}
                  >
                      <span className="text-lg text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{link.label}</span>
                      <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                  </button>
              ))}
          </div>
      </Card>
    </div>
  );
};

export default Settings;