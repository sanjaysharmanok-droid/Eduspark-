import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { UserRole, Theme, Language, User, LessonList, QuizAttempt, SavedTopic, SubscriptionTier, Usage } from '../types';
import * as googleAuthService from '../services/googleAuthService';
import { ToolKey } from '../constants';

const VISUAL_ASSISTANT_COST = 10;
const DAILY_LIMITS = {
  // Student
  quizQuestions: 100,
  topicSearches: 5,
  homeworkHelps: 5,
  // Teacher
  presentations: 3,
  lessonPlans: 5,
  activities: 3,
};

interface AppContextType {
  user: User | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  userRole: UserRole | null;
  setUserRole: (role: UserRole | null) => void;
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  lessonLists: LessonList[];
  addLessonList: (name: string) => LessonList;
  addTopicToLessonList: (listId: string, topic: SavedTopic) => void;
  quizAttempts: QuizAttempt[];
  addQuizAttempt: (attempt: Omit<QuizAttempt, 'id' | 'date'>) => void;
  activeQuizTopic: string | null;
  setActiveQuizTopic: (topic: string | null) => void;
  activeTool: ToolKey;
  setActiveTool: (tool: ToolKey) => void;
  // New subscription properties
  subscriptionTier: SubscriptionTier;
  credits: number;
  usage: Usage;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (isOpen: boolean) => void;
  upgradeSubscription: (tier: 'silver' | 'gold') => void;
  canUseFeature: (feature: keyof Omit<Usage, 'date'> | 'visualAssistant', amount?: number) => boolean;
  useFeature: (feature: keyof Omit<Usage, 'date'> | 'visualAssistant', amount?: number) => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem('user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('Failed to parse user from localStorage', error);
      localStorage.removeItem('user');
      return null;
    }
  });
  const [userRole, setUserRoleState] = useState<UserRole | null>(() => (localStorage.getItem('userRole') as UserRole) || null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');
  
  // State for library and reports
  const [lessonLists, setLessonLists] = useState<LessonList[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('lessonLists') || '[]');
    } catch (error) {
      console.error('Failed to parse lessonLists from localStorage', error);
      localStorage.removeItem('lessonLists');
      return [];
    }
  });
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('quizAttempts') || '[]');
    } catch (error) {
      console.error('Failed to parse quizAttempts from localStorage', error);
      localStorage.removeItem('quizAttempts');
      return [];
    }
  });
  const [activeQuizTopic, setActiveQuizTopic] = useState<string | null>(null);

  // Active tool state management
  const defaultTool = useMemo(() => (userRole === 'teacher' ? 'lessonPlanner' : 'homeworkHelper') as ToolKey, [userRole]);
  const [activeTool, setActiveTool] = useState<ToolKey>(defaultTool);

  // New subscription state
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(() => (localStorage.getItem('subscriptionTier') as SubscriptionTier) || 'free');
  const [credits, setCredits] = useState<number>(() => parseInt(localStorage.getItem('credits') || '0', 10));
  const [usage, setUsage] = useState<Usage>(() => {
    const defaultUsage = { 
        date: getTodayDateString(), 
        quizQuestions: 0, 
        topicSearches: 0, 
        homeworkHelps: 0,
        presentations: 0,
        lessonPlans: 0,
        activities: 0
    };
    try {
      const storedUsage = localStorage.getItem('usage');
      return storedUsage ? { ...defaultUsage, ...JSON.parse(storedUsage) } : defaultUsage;
    } catch (error) {
      console.error('Failed to parse usage from localStorage', error);
      localStorage.removeItem('usage');
      return defaultUsage;
    }
  });

  // Effect to initialize a new user
  useEffect(() => {
    if (user && !localStorage.getItem('userInitialized')) {
      setSubscriptionTier('free');
      setCredits(500); // Sign-up bonus
      setUsage({ date: getTodayDateString(), quizQuestions: 0, topicSearches: 0, homeworkHelps: 0, presentations: 0, lessonPlans: 0, activities: 0 });
      localStorage.setItem('lastFreeCreditReset', new Date().toISOString());
      localStorage.setItem('userInitialized', 'true');
    }
  }, [user]);
  
  // Effect for daily/monthly resets
  useEffect(() => {
    const today = new Date();
    const todayStr = getTodayDateString();
    
    // Daily usage reset
    if (usage.date !== todayStr) {
      setUsage({ date: todayStr, quizQuestions: 0, topicSearches: 0, homeworkHelps: 0, presentations: 0, lessonPlans: 0, activities: 0 });
    }

    const lastResetStr = localStorage.getItem('lastCreditReset') || new Date(0).toISOString();
    const lastReset = new Date(lastResetStr);

    // Daily credit reset for premium users
    if (subscriptionTier !== 'free' && lastReset.toISOString().split('T')[0] !== todayStr) {
        const dailyCredits = subscriptionTier === 'gold' ? 100 : 30;
        setCredits(prev => prev + dailyCredits);
        localStorage.setItem('lastCreditReset', today.toISOString());
    }

    // Monthly credit reset for free users
    if (subscriptionTier === 'free' && (today.getMonth() !== lastReset.getMonth() || today.getFullYear() !== lastReset.getFullYear())) {
        setCredits(prev => prev + 100);
        localStorage.setItem('lastCreditReset', today.toISOString());
    }
  }, []);


  // Persistence effects
  useEffect(() => { localStorage.setItem('user', JSON.stringify(user)); }, [user]);
  useEffect(() => { if (userRole) localStorage.setItem('userRole', userRole); else localStorage.removeItem('userRole'); }, [userRole]);
  useEffect(() => { const root = window.document.documentElement; root.classList.remove('light', 'dark'); root.classList.add(theme); localStorage.setItem('theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('language', language); }, [language]);
  useEffect(() => { localStorage.setItem('lessonLists', JSON.stringify(lessonLists)); }, [lessonLists]);
  useEffect(() => { localStorage.setItem('quizAttempts', JSON.stringify(quizAttempts)); }, [quizAttempts]);
  useEffect(() => { localStorage.setItem('subscriptionTier', subscriptionTier); }, [subscriptionTier]);
  useEffect(() => { localStorage.setItem('credits', credits.toString()); }, [credits]);
  useEffect(() => { localStorage.setItem('usage', JSON.stringify(usage)); }, [usage]);
  useEffect(() => { if (userRole) setActiveTool(defaultTool); }, [userRole, defaultTool]);

  const signIn = useCallback(async () => {
    const userData = await googleAuthService.signIn();
    setUser(userData);
  }, []);

  const signOut = useCallback(async () => {
    await googleAuthService.signOut();
    setUser(null);
    setUserRoleState(null);
    // Also clear subscription data for full sign-out simulation
    localStorage.removeItem('userInitialized');
    localStorage.removeItem('subscriptionTier');
    localStorage.removeItem('credits');
    localStorage.removeItem('usage');
  }, []);

  const setUserRole = useCallback((role: UserRole | null) => setUserRoleState(role), []);
  const toggleTheme = useCallback(() => setTheme(prev => (prev === 'light' ? 'dark' : 'light')), []);
  const setLanguage = useCallback((lang: Language) => setLanguageState(lang), []);
  const addLessonList = useCallback((name: string) => { const newList: LessonList = { id: Date.now().toString(), name, topics: [] }; setLessonLists(prev => [...prev, newList]); return newList; }, []);
  const addTopicToLessonList = useCallback((listId: string, topic: SavedTopic) => { setLessonLists(prev => prev.map(list => list.id === listId ? { ...list, topics: [...list.topics, topic] } : list)); }, []);
  const addQuizAttempt = useCallback((attempt: Omit<QuizAttempt, 'id' | 'date'>) => { const newAttempt: QuizAttempt = { ...attempt, id: Date.now().toString(), date: new Date().toISOString() }; setQuizAttempts(prev => [newAttempt, ...prev]); }, []);
  
  const upgradeSubscription = useCallback((tier: 'silver' | 'gold') => {
      setSubscriptionTier(tier);
      // Simulate immediate benefit
      localStorage.setItem('lastCreditReset', new Date(0).toISOString()); // Force credit refresh on next load
      setIsSubscriptionModalOpen(false);
  }, []);

  const canUseFeature = useCallback((feature: keyof Omit<Usage, 'date'> | 'visualAssistant', amount = 1): boolean => {
    if (subscriptionTier === 'silver' || subscriptionTier === 'gold') {
        if (feature === 'visualAssistant') return credits >= VISUAL_ASSISTANT_COST;
        return true; // Unlimited daily usage for premium
    }
    // Free tier logic
    if (feature === 'visualAssistant') return credits >= VISUAL_ASSISTANT_COST;
    if (feature in DAILY_LIMITS) {
        return (usage[feature as keyof typeof DAILY_LIMITS] + amount) <= DAILY_LIMITS[feature as keyof typeof DAILY_LIMITS];
    }
    return true; // Should not happen for limited features
  }, [subscriptionTier, credits, usage]);

  const useFeature = useCallback((feature: keyof Omit<Usage, 'date'> | 'visualAssistant', amount = 1) => {
    if (feature === 'visualAssistant') {
        setCredits(c => Math.max(0, c - VISUAL_ASSISTANT_COST));
    } else if (feature in usage) {
        setUsage(u => ({...u, [feature]: u[feature as keyof typeof DAILY_LIMITS] + amount }));
    }
  }, [usage]);

  const value = useMemo(() => ({
    user, signIn, signOut, userRole, setUserRole, theme, toggleTheme, language, setLanguage,
    lessonLists, addLessonList, addTopicToLessonList, quizAttempts, addQuizAttempt,
    activeQuizTopic, setActiveQuizTopic, activeTool, setActiveTool,
    subscriptionTier, credits, usage, isSubscriptionModalOpen, setIsSubscriptionModalOpen,
    upgradeSubscription, canUseFeature, useFeature
  }), [
    user, signIn, signOut, userRole, theme, language, lessonLists, quizAttempts, activeQuizTopic, activeTool,
    subscriptionTier, credits, usage, isSubscriptionModalOpen,
    setUserRole, toggleTheme, setLanguage, addLessonList, addTopicToLessonList, addQuizAttempt,
    setActiveTool, upgradeSubscription, canUseFeature, useFeature
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};