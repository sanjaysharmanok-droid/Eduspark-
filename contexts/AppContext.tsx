import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { UserRole, Theme, Language, User, LessonList, QuizAttempt, SavedTopic, SubscriptionTier, Usage } from '../types';
import { onAuthStateChanged, signOut as firebaseSignOut, FirebaseUser } from '../services/authService';
import { auth } from '../services/firebase';
import { ToolKey } from '../constants';
import * as firestoreService from '../services/firestoreService';
import { updateModelConfig } from '../services/geminiService';

const VISUAL_ASSISTANT_COST = 10;
const DAILY_LIMITS = {
  // Student
  quizQuestions: 100,
  topicSearches: 5,
  homeworkHelps: 5,
  summaries: 5,
  // Teacher
  presentations: 3,
  lessonPlans: 5,
  activities: 3,
};

interface AppConfig {
    planPrices: {
        silver: string;
        gold: string;
    };
    aiModels: {
        [key:string]: string;
    };
}

interface AppContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
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
  // New subscription properties
  subscriptionTier: SubscriptionTier;
  credits: number;
  usage: Usage;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (isOpen: boolean) => void;
  upgradeSubscription: (tier: 'silver' | 'gold') => void;
  canUseFeature: (feature: keyof Omit<Usage, 'date'> | 'visualAssistant', amount?: number) => boolean;
  useFeature: (feature: keyof Omit<Usage, 'date'> | 'visualAssistant', amount?: number) => void;
  startGuestSession: () => void;
  // Admin properties
  isAdmin: boolean;
  appConfig: AppConfig | null;
  adminViewMode: 'admin' | 'user' | null;
  setAdminViewMode: (mode: 'admin' | 'user') => void;
  isAdminViewSelected: boolean;
  selectAdminView: (view: 'student' | 'teacher' | 'admin') => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

const getTodayDateString = () => new Date().toISOString().split('T')[0];

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
  const [usage, setUsage] = useState<Usage>({ date: getTodayDateString(), quizQuestions: 0, topicSearches: 0, homeworkHelps: 0, presentations: 0, lessonPlans: 0, activities: 0, summaries: 0 });

  // Admin State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'user' | null>(null);
  const [isAdminViewSelected, setIsAdminViewSelected] = useState<boolean>(false);

  const [activeTool, setActiveTool] = useState<ToolKey>('homeworkHelper');

  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const appUser: User = { name: fbUser.displayName || 'User', email: fbUser.email || '', picture: fbUser.photoURL || '' };
        setUser(appUser);
      } else {
        setUser(null);
        setDataLoading(false); // No data to load if not logged in
        setIsAdmin(false); // Reset admin status on logout
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch data when user logs in or on initial load
  useEffect(() => {
    const fetchData = async () => {
        setDataLoading(true);
        try {
            const config = await firestoreService.getAppConfig();
            setAppConfig(config);
            if (config?.aiModels) {
                updateModelConfig(config.aiModels);
            }

            if (firebaseUser) {
                let userData = await firestoreService.getUserData(firebaseUser.uid);
                if (!userData) {
                    userData = await firestoreService.createUserProfileDocument(firebaseUser);
                }

                if (userData) {
                    const isAdminUser = userData.isAdmin === true;
                    setIsAdmin(isAdminUser);
                    
                    setLanguageState(userData.settings?.language || 'en');
                    setSubscriptionTier(userData.subscription?.tier || 'free');
                    setCredits(userData.subscription?.credits || 0);

                    if (isAdminUser) {
                        // Admin Flow: Force selection, clear role to prevent conflicts.
                        setIsAdminViewSelected(false); 
                        setUserRoleState(null); 
                        setAdminViewMode(null);
                    } else {
                        // Regular User Flow
                        const role = userData.settings?.role || null;
                        setUserRoleState(role);
                        setAdminViewMode(null);
                        setIsAdminViewSelected(true);
                        if (role) {
                             setActiveTool(role === 'teacher' ? 'lessonPlanner' : 'homeworkHelper');
                        }
                    }
                    
                    const todayStr = getTodayDateString();
                    const userUsage = userData.usage || { date: '1970-01-01', quizQuestions: 0, topicSearches: 0, homeworkHelps: 0, presentations: 0, lessonPlans: 0, activities: 0, summaries: 0 };
                    
                    if (userUsage.date !== todayStr) {
                        const newUsage = { ...usage, date: todayStr };
                        setUsage(newUsage);
                        firestoreService.updateUserData(firebaseUser.uid, { usage: newUsage });
                    } else {
                        setUsage(userUsage);
                    }
                    
                    const [lists, attempts] = await Promise.all([
                       firestoreService.getLessonLists(firebaseUser.uid),
                       firestoreService.getQuizAttempts(firebaseUser.uid)
                    ]);
                    setLessonLists(lists);
                    setQuizAttempts(attempts);
                }
            } else {
                // Reset state on logout
                setUserRoleState(null);
                setLessonLists([]);
                setQuizAttempts([]);
                setAdminViewMode(null);
                setIsAdminViewSelected(false);
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        } finally {
            setDataLoading(false);
        }
    };
    
    fetchData();
  }, [firebaseUser]);
  
  // Set theme based on system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setThemeState(newTheme);
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(newTheme);
    };

    handleChange({ matches: mediaQuery.matches } as MediaQueryListEvent);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const signOut = useCallback(async () => {
    if (firebaseUser) {
      await firebaseSignOut();
    } else {
      setUser(null);
      setUserRoleState(null);
    }
    setAdminViewMode(null);
    setIsAdminViewSelected(false); // Reset on sign out
  }, [firebaseUser]);
  
  const startGuestSession = useCallback(() => {
    setUser({ name: 'Guest Student', email: 'guest@eduspark.ai', picture: '' });
    setFirebaseUser(null);
    setUserRoleState('student');
    setSubscriptionTier('free');
    setCredits(50);
    setUsage({ date: getTodayDateString(), quizQuestions: 0, topicSearches: 0, homeworkHelps: 0, presentations: 0, lessonPlans: 0, activities: 0, summaries: 0 });
    setLessonLists([]);
    setQuizAttempts([]);
    setIsAdminViewSelected(true);
    setAuthLoading(false);
    setDataLoading(false);
  }, []);

  const selectAdminView = useCallback((view: 'student' | 'teacher' | 'admin') => {
    if (view === 'admin') {
        setUserRoleState('teacher'); // Default role context for admin's user view
        setAdminViewMode('admin');
        setActiveTool('adminPanel');
    } else {
        setUserRoleState(view);
        setAdminViewMode('user');
        setActiveTool(view === 'teacher' ? 'lessonPlanner' : 'homeworkHelper');
    }
    setIsAdminViewSelected(true);
  }, [setActiveTool]);

  // --- State Modification Callbacks ---

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
  
  const upgradeSubscription = useCallback((tier: 'silver' | 'gold') => {
      if (!firebaseUser) return;
      setSubscriptionTier(tier);
      firestoreService.updateUserData(firebaseUser.uid, { 'subscription.tier': tier });
      setIsSubscriptionModalOpen(false);
  }, [firebaseUser]);

  const canUseFeature = useCallback((feature: keyof Omit<Usage, 'date'> | 'visualAssistant', amount = 1): boolean => {
    if (subscriptionTier === 'silver' || subscriptionTier === 'gold') {
        if (feature === 'visualAssistant') return credits >= VISUAL_ASSISTANT_COST;
        return true;
    }
    if (feature === 'visualAssistant') return credits >= VISUAL_ASSISTANT_COST;
    if (feature in DAILY_LIMITS) {
        return (usage[feature as keyof typeof DAILY_LIMITS] + amount) <= DAILY_LIMITS[feature as keyof typeof DAILY_LIMITS];
    }
    return true;
  }, [subscriptionTier, credits, usage]);

  const useFeature = useCallback((feature: keyof Omit<Usage, 'date'> | 'visualAssistant', amount = 1) => {
    if (feature === 'visualAssistant') {
        const newCredits = Math.max(0, credits - VISUAL_ASSISTANT_COST);
        setCredits(newCredits);
        if (firebaseUser) firestoreService.updateUserData(firebaseUser.uid, { 'subscription.credits': newCredits });
    } else if (feature in usage) {
        const newUsage = {...usage, [feature]: usage[feature as keyof typeof DAILY_LIMITS] + amount };
        setUsage(newUsage);
        if (firebaseUser) firestoreService.updateUserData(firebaseUser.uid, { usage: newUsage });
    }
  }, [firebaseUser, credits, usage]);
  
  const value = useMemo(() => ({
    user, firebaseUser, signOut, userRole, setUserRole, theme, language, setLanguage,
    lessonLists, addLessonList, addTopicToLessonList, quizAttempts, addQuizAttempt,
    activeQuizTopic, setActiveQuizTopic, activeTool, setActiveTool,
    subscriptionTier, credits, usage, isSubscriptionModalOpen, setIsSubscriptionModalOpen,
    upgradeSubscription, canUseFeature, useFeature, startGuestSession,
    isAdmin, appConfig, adminViewMode, setAdminViewMode, isAdminViewSelected, selectAdminView
  }), [
    user, firebaseUser, signOut, userRole, theme, language, lessonLists, quizAttempts, activeQuizTopic, activeTool,
    subscriptionTier, credits, usage, isSubscriptionModalOpen, startGuestSession, isAdmin, appConfig, adminViewMode, isAdminViewSelected,
    setUserRole, setLanguage, addLessonList, addTopicToLessonList, addQuizAttempt,
    setActiveTool, upgradeSubscription, canUseFeature, useFeature, selectAdminView, setAdminViewMode
  ]);

  if (authLoading || dataLoading) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-slate-900">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
    );
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};