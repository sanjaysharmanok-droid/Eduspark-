import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { translations } from '../translations';

export const useTranslations = () => {
  const { language } = useContext(AppContext);

  const t = (key: keyof typeof translations) => {
    return translations[key][language] || translations[key]['en'];
  };

  return { t, language };
};
