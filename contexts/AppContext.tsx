import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { UserRole, Theme, Language, User, LessonList, QuizAttempt, SavedTopic, SubscriptionTier, Usage } from '../types';
import { onAuthStateChanged, signOut as firebaseSignOut, FirebaseUser } from '../services/authService';
import { auth } from '../services/firebase';
import { ToolKey } from '../constants';
import * as firestoreService from '../services/firestoreService';

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

interface AppContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null; // <-- Added this
  signOut: () => Promise<void>;
  userRole: UserRole | null;
  setUserRole: (role: UserRole | null) => void;
  theme: Theme;
  toggleTheme: () => void;
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

  const defaultTool = useMemo(() => (userRole === 'teacher' ? 'lessonPlanner' : 'homeworkHelper') as ToolKey, [userRole]);
  const [activeTool, setActiveTool] = useState<ToolKey>(defaultTool);

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
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch data when user logs in or on initial load
  useEffect(() => {
    const fetchData = async () => {
      if (firebaseUser) {
        setDataLoading(true);
        let userData = await firestoreService.getUserData(firebaseUser.uid);
        if (!userData) {
          userData = await firestoreService.createUserProfileDocument(firebaseUser);
        }

        if (userData) {
          // Set state from Firestore data
          setUserRoleState(userData.settings.role || null);
          setThemeState(userData.settings.theme || 'light');
          setLanguageState(userData.settings.language || 'en');
          setSubscriptionTier(userData.subscription.tier || 'free');
          setCredits(userData.subscription.credits || 0);

          // Handle daily/monthly resets
          const todayStr = getTodayDateString();
          if (userData.usage.date !== todayStr) {
            const newUsage = { ...usage, date: todayStr };
            setUsage(newUsage);
            firestoreService.updateUserData(firebaseUser.uid, { usage: newUsage });
          } else {
            setUsage(userData.usage);
          }
          
          // Fetch subcollections
          const [lists, attempts] = await Promise.all([
             firestoreService.getLessonLists(firebaseUser.uid),
             firestoreService.getQuizAttempts(firebaseUser.uid)
          ]);
          setLessonLists(lists);
          setQuizAttempts(attempts);
        }
        setDataLoading(false);
      } else {
         // Reset state on logout
        setUserRoleState(null);
        setThemeState('light');
        setLessonLists([]);
        setQuizAttempts([]);
      }
    };
    fetchData();
  }, [firebaseUser]);
  
  // Set theme class on body
  useEffect(() => { 
      const root = window.document.documentElement; 
      root.classList.remove('light', 'dark'); 
      root.classList.add(theme); 
  }, [theme]);
  
  // Update default tool when role changes
  useEffect(() => { if (userRole) setActiveTool(defaultTool); }, [userRole, defaultTool]);

  const signOut = useCallback(async () => {
    if (firebaseUser) {
      await firebaseSignOut();
      // onAuthStateChanged listener will handle clearing user state.
    } else {
      // It's a guest user, just clear the state manually
      setUser(null);
      setUserRoleState(null);
    }
  }, [firebaseUser]);
  
  const startGuestSession = useCallback(() => {
    setUser({ name: 'Guest Student', email: 'guest@eduspark.ai', picture: '' });
    setFirebaseUser(null);
    setUserRoleState('student');
    // Set default free tier values for guest
    setSubscriptionTier('free');
    setCredits(0);
    setUsage({ date: getTodayDateString(), quizQuestions: 0, topicSearches: 0, homeworkHelps: 0, presentations: 0, lessonPlans: 0, activities: 0, summaries: 0 });
    setLessonLists([]);
    setQuizAttempts([]);
    setAuthLoading(false);
    setDataLoading(false);
  }, []);

  // --- State Modification Callbacks ---

  const setUserRole = useCallback((role: UserRole | null) => {
    setUserRoleState(role);
    if (firebaseUser) firestoreService.updateUserData(firebaseUser.uid, { 'settings.role': role });
  }, [firebaseUser]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setThemeState(newTheme);
    if (firebaseUser) firestoreService.updateUserData(firebaseUser.uid, { 'settings.theme': newTheme });
  }, [theme, firebaseUser]);

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
    user, firebaseUser, signOut, userRole, setUserRole, theme, toggleTheme, language, setLanguage,
    lessonLists, addLessonList, addTopicToLessonList, quizAttempts, addQuizAttempt,
    activeQuizTopic, setActiveQuizTopic, activeTool, setActiveTool,
    subscriptionTier, credits, usage, isSubscriptionModalOpen, setIsSubscriptionModalOpen,
    upgradeSubscription, canUseFeature, useFeature, startGuestSession
  }), [
    user, firebaseUser, signOut, userRole, theme, language, lessonLists, quizAttempts, activeQuizTopic, activeTool,
    subscriptionTier, credits, usage, isSubscriptionModalOpen, startGuestSession,
    setUserRole, toggleTheme, setLanguage, addLessonList, addTopicToLessonList, addQuizAttempt,
    setActiveTool, upgradeSubscription, canUseFeature, useFeature
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
