import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { UserRole, Theme, Language, User, LessonList, QuizAttempt, SavedTopic, SubscriptionTier, Usage, AppConfig } from '../types';
import { onAuthStateChanged, signOut as firebaseSignOut, FirebaseUser } from '../services/authService';
import { auth } from '../services/firebase';
import { ToolKey, TOOLS } from '../constants';
import * as firestoreService from '../services/firestoreService';
import { updateModelConfig } from '../services/geminiService';

interface AppContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  authLoading: boolean;
  dataLoading: boolean;
  signOut: () => Promise<void>;
  userRole: UserRole | null;
  setUserRole: (role: UserRole | null) => void;
  theme: Theme;
  language: Language;
  setLanguage: (lang: Language) => void;
  lessonLists: LessonList[];
  addLessonList: (name: string) => Promise<LessonList | null>;
  addTopicToLessonList: (listId: string, topic: SavedTopic) => void;
  quizAttempts: QuizAttempt[];
  addQuizAttempt: (attempt: Omit<QuizAttempt, 'id' | 'date'>) => void;
  activeQuizTopic: string | null;
  setActiveQuizTopic: (topic: string | null) => void;
  activeTool: ToolKey;
  setActiveTool: (tool: ToolKey) => void;
  subscriptionTier: SubscriptionTier;
  credits: number;
  usage: Usage;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (isOpen: boolean) => void;
  canUseFeature: (feature: keyof Omit<Usage, 'date'> | ToolKey, amount?: number) => boolean;
  useFeature: (feature: keyof Omit<Usage, 'date'> | ToolKey, amount?: number) => void;
  startGuestSession: () => void;
  isAdmin: boolean;
  appConfig: AppConfig | null;
  adminViewMode: 'admin' | 'user' | null;
  setAdminViewMode: (mode: 'admin' | 'user') => void;
  isAdminViewSelected: boolean;
  selectAdminView: (view: 'student' | 'teacher' | 'admin') => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const defaultUsage: Omit<Usage, 'date'> = {
    quizQuestions: 0,
    topicSearches: 0,
    homeworkHelps: 0,
    presentations: 0,
    lessonPlans: 0,
    activities: 0,
    summaries: 0,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  // App State
  const [userRole, setUserRoleState] = useState<UserRole | null>(null);
  const [theme, setThemeState] = useState<Theme>('light');
  const [language, setLanguageState] = useState<Language>('en');
  const [lessonLists, setLessonLists] = useState<LessonList[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [activeQuizTopic, setActiveQuizTopic] = useState<string | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [credits, setCredits] = useState<number>(0);
  const [usage, setUsage] = useState<Usage>({ date: getTodayDateString(), ...defaultUsage });

  // Admin and Config State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'user' | null>(null);
  const [isAdminViewSelected, setIsAdminViewSelected] = useState<boolean>(false);

  const [activeTool, setActiveTool] = useState<ToolKey>('homeworkHelper');
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page') as ToolKey | null;

    if (page) {
        // Validate that the page is a valid ToolKey
        const validTools = Object.keys(TOOLS);
        const validInfoPages: ToolKey[] = ['about', 'privacyPolicy', 'termsAndConditions', 'contactUs', 'refundPolicy'];
        if (validTools.includes(page) || validInfoPages.includes(page)) {
             setActiveTool(page);
        }
    }
  }, []); // Run only on initial mount


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const appUser: User = { name: fbUser.displayName || 'User', email: fbUser.email || '', picture: fbUser.photoURL || '' };
        setUser(appUser);
        setFirebaseUser(fbUser);
      } else {
        setUser(null);
        setFirebaseUser(null);
        setIsAdmin(false);
        setUserRoleState(null);
        setAdminViewMode(null);
        setIsAdminViewSelected(false);
        setDataLoading(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = firestoreService.onAppConfigSnapshot((config) => {
        setAppConfig(config);
        if (config?.aiModels) {
            updateModelConfig(config.aiModels);
        }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
        setDataLoading(false);
        return;
    }
    if (!appConfig) return;
    setDataLoading(true);

    const unsubscribe = firestoreService.onUserDataSnapshot(firebaseUser.uid, async (userData) => {
        if (!userData) {
            await firestoreService.createUserProfileDocument(firebaseUser);
            return;
        }

        // --- Security Check: Blocked User ---
        if (userData.status === 'blocked') {
            alert("Your account has been suspended by an administrator. Please contact support.");
            firebaseSignOut();
            return; // Stop processing data for this user
        }

        let isAdminUser = userData.isAdmin === true;
        if (!isAdminUser && appConfig.superAdmins?.includes(firebaseUser.email!)) {
            isAdminUser = true;
            firestoreService.updateUserData(firebaseUser.uid, { isAdmin: true });
        }
        setIsAdmin(isAdminUser);
        
        if (isAdminUser) {
            if (!adminViewMode) {
                setIsAdminViewSelected(false);
                setUserRoleState(null);
            }
        } else {
            const role = userData.settings?.role || null;
            setUserRoleState(role);
            if (activeTool === 'adminPanel') {
                setActiveTool(role === 'teacher' ? 'lessonPlanner' : 'homeworkHelper');
            }
        }
        
        setLanguageState(userData.settings?.language || 'en');
        setSubscriptionTier(userData.subscription?.tier || 'free');
        setCredits(userData.subscription?.credits || 0);
        
        const todayStr = getTodayDateString();
        if (userData.usage?.date !== todayStr) {
            const newUsage = { date: todayStr, ...defaultUsage };
            setUsage(newUsage);
            firestoreService.updateUserData(firebaseUser.uid, { usage: newUsage });
        } else {
            setUsage({ date: todayStr, ...defaultUsage, ...userData.usage });
        }
        
        const [lists, attempts] = await Promise.all([
           firestoreService.getLessonLists(firebaseUser.uid),
           firestoreService.getQuizAttempts(firebaseUser.uid)
        ]);
        setLessonLists(lists);
        setQuizAttempts(attempts);

        setDataLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser, appConfig, adminViewMode]);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setThemeState(newTheme);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(newTheme);
    };
    handleChange({ matches: mediaQuery.matches } as MediaQueryListEvent);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut();
  }, []);
  
  const startGuestSession = useCallback(() => {
    setUser({ name: 'Guest Student', email: 'guest@eduspark.ai', picture: '' });
    setFirebaseUser(null);
    setUserRoleState('student');
    setSubscriptionTier('free');
    setCredits(50);
    setUsage({ date: getTodayDateString(), ...defaultUsage });
    setLessonLists([]);
    setQuizAttempts([]);
    setIsAdmin(false);
    setIsAdminViewSelected(false);
    setAuthLoading(false);
    setDataLoading(false);
  }, []);

  const selectAdminView = useCallback((view: 'student' | 'teacher' | 'admin') => {
    if (view === 'admin') {
        setUserRoleState('teacher');
        setAdminViewMode('admin');
        setActiveTool('adminPanel');
    } else {
        setUserRoleState(view);
        setAdminViewMode('user');
        setActiveTool(view === 'teacher' ? 'lessonPlanner' : 'homeworkHelper');
    }
    setIsAdminViewSelected(true);
  }, []);

  const setUserRole = useCallback((role: UserRole | null) => {
    setUserRoleState(role);
    if (firebaseUser) firestoreService.updateUserData(firebaseUser.uid, { 'settings.role': role });
  }, [firebaseUser]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (firebaseUser) firestoreService.updateUserData(firebaseUser.uid, { 'settings.language': lang });
  }, [firebaseUser]);

  const addLessonList = useCallback(async (name: string) => {
    if (!firebaseUser) return null;
    const newList = await firestoreService.addLessonList(firebaseUser.uid, name);
    setLessonLists(prev => [...prev, newList]);
    return newList;
  }, [firebaseUser]);

  const addTopicToLessonList = useCallback((listId: string, topic: SavedTopic) => {
    if (!firebaseUser) return;
    firestoreService.addTopicToLessonList(firebaseUser.uid, listId, topic);
    setLessonLists(prev => prev.map(list => list.id === listId ? { ...list, topics: [...list.topics, topic] } : list));
  }, [firebaseUser]);

  const addQuizAttempt = useCallback(async (attempt: Omit<QuizAttempt, 'id' | 'date'>) => {
    if (!firebaseUser) return;
    const newAttempt = await firestoreService.addQuizAttempt(firebaseUser.uid, attempt);
    setQuizAttempts(prev => [newAttempt, ...prev]);
  }, [firebaseUser]);

  const canUseFeature = useCallback((feature: ToolKey, amount = 1): boolean => {
    if (!appConfig) return false;
    
    if (feature === 'adminPanel') {
        return isAdmin;
    }
    
    const featureConfig = appConfig.featureAccess[feature];
    if (!featureConfig || !featureConfig.enabled) return false;
    const tierHierarchy: Record<SubscriptionTier, number> = { free: 0, silver: 1, gold: 2 };
    if (tierHierarchy[subscriptionTier] < tierHierarchy[featureConfig.minTier]) return false;
    const creditCost = appConfig.usageLimits.creditCosts[feature];
    if (creditCost) return credits >= creditCost * amount;
    if (subscriptionTier === 'free') {
        const limit = appConfig.usageLimits.freeTier[feature as keyof typeof usage];
        if (limit !== undefined) {
            const currentUsage = Number(usage[feature as keyof Usage]) || 0;
            return (currentUsage + amount) <= limit;
        }
    }
    return true;
  }, [appConfig, subscriptionTier, credits, usage, isAdmin]);

  const useFeature = useCallback((feature: ToolKey, amount = 1) => {
    if (!appConfig || !firebaseUser) return;

    firestoreService.logUserActivity(firebaseUser.uid, firebaseUser.email!, 'useFeature', { feature, amount });

    const creditCost = appConfig.usageLimits.creditCosts[feature];
    if (creditCost) {
        const newCredits = Math.max(0, credits - (creditCost * amount));
        setCredits(newCredits);
        firestoreService.updateUserData(firebaseUser.uid, { 'subscription.credits': newCredits });
    } else {
        const limit = appConfig.usageLimits.freeTier[feature as keyof typeof usage];
        if (subscriptionTier === 'free' && limit !== undefined) {
            const currentUsage = Number(usage[feature as keyof Usage]) || 0;
            const newUsage = { ...usage, [feature]: currentUsage + amount };
            setUsage(newUsage);
            firestoreService.updateUserData(firebaseUser.uid, { usage: newUsage });
        }
    }
  }, [firebaseUser, credits, usage, appConfig, subscriptionTier]);
  
  const value: AppContextType = {
    user, firebaseUser, authLoading, dataLoading, signOut, userRole, setUserRole, theme, language, setLanguage,
    lessonLists, addLessonList, addTopicToLessonList, quizAttempts, addQuizAttempt,
    activeQuizTopic, setActiveQuizTopic, activeTool, setActiveTool,
    subscriptionTier, credits, usage, isSubscriptionModalOpen, setIsSubscriptionModalOpen,
    canUseFeature, useFeature, startGuestSession,
    isAdmin, appConfig, adminViewMode, setAdminViewMode, isAdminViewSelected, selectAdminView
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};