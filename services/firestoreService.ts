import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, arrayUnion, serverTimestamp, onSnapshot, Unsubscribe, query, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { User, UserRole, Theme, Language, SubscriptionTier, Usage, LessonList, SavedTopic, QuizAttempt, AppConfig } from '../types';
import { FirebaseUser } from './authService';
import { TOOLS } from '../constants';

// =================================================================================================
// SUPER ADMIN CONFIGURATION
// =================================================================================================
// Add the Google account emails of users who should be automatically promoted to "Super Admin"
// the first time they log in. This is crucial for initial setup.
// The email 'sanjaysharmanok@gmail.com' is included as a default.
// IMPORTANT: Add your primary Google account email here to gain admin access.
// Once an admin exists, they can grant admin rights to others via the Admin Panel.
const SUPER_ADMINS_LIST = [
    'sanjaysharmanok@gmail.com',
];

// --- User Profile and Settings ---

export const createUserProfileDocument = async (firebaseUser: FirebaseUser, additionalData?: object) => {
  if (!firebaseUser) return;

  const userRef = doc(db, `users/${firebaseUser.uid}`);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { displayName, email, photoURL } = firebaseUser;
    const createdAt = new Date();
    
    const defaultUserData = {
      profile: {
        name: displayName,
        email,
        picture: photoURL,
        createdAt,
      },
      settings: {
        role: null,
        language: 'en',
      },
      subscription: {
        tier: 'free',
        credits: 500, // Sign-up bonus
        lastCreditReset: new Date().toISOString(),
        status: 'active',
      },
      usage: {
        date: new Date().toISOString().split('T')[0],
        quizQuestions: 0,
        topicSearches: 0,
        homeworkHelps: 0,
        presentations: 0,
        lessonPlans: 0,
        activities: 0,
        summaries: 0,
      },
      isAdmin: false, // Default to not admin
      status: 'active', // 'active' or 'blocked'
      ...additionalData
    };

    try {
      await setDoc(userRef, defaultUserData);
      return defaultUserData;
    } catch (error) {
      console.error("Error creating user profile", error);
    }
  }
  return snapshot.data();
};

export const getUserData = async (uid: string) => {
  if (!uid) return null;
  const userRef = doc(db, `users/${uid}`);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? snapshot.data() : null;
};

export const onUserDataSnapshot = (uid: string, callback: (data: any) => void): Unsubscribe => {
  if (!uid) {
    return () => {};
  }
  const userRef = doc(db, `users/${uid}`);
  const unsubscribe = onSnapshot(userRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : null);
  });
  return unsubscribe;
};

export const updateUserData = async (uid: string, data: object) => {
  const userRef = doc(db, `users/${uid}`);
  try {
    await updateDoc(userRef, data);
  } catch (error) {
    console.error("Error updating user data:", error);
  }
};

// --- Activity Logging ---
export const logUserActivity = async (uid: string, email: string, action: string, details: object = {}) => {
  if (!uid) return;
  try {
    const activityLogsRef = collection(db, 'activityLogs');
    await addDoc(activityLogsRef, {
      userId: uid,
      userEmail: email,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging user activity:", error);
  }
};

// --- Lesson Lists and Topics ---
export const getLessonLists = async (uid: string): Promise<LessonList[]> => {
    const listsRef = collection(db, `users/${uid}/lessonLists`);
    const snapshot = await getDocs(listsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LessonList));
};

export const addLessonList = async (uid: string, name: string): Promise<LessonList> => {
    const listsRef = collection(db, `users/${uid}/lessonLists`);
    const newList = { name, topics: [], createdAt: serverTimestamp() };
    const docRef = await addDoc(listsRef, newList);
    return { id: docRef.id, ...newList } as LessonList;
};

export const addTopicToLessonList = async (uid: string, listId: string, topic: SavedTopic) => {
    const listRef = doc(db, `users/${uid}/lessonLists/${listId}`);
    await updateDoc(listRef, {
        topics: arrayUnion(topic)
    });
};

// --- Quiz Attempts ---
export const getQuizAttempts = async (uid: string): Promise<QuizAttempt[]> => {
    const attemptsRef = collection(db, `users/${uid}/quizAttempts`);
    const q = query(attemptsRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt));
};

export const addQuizAttempt = async (uid: string, attempt: Omit<QuizAttempt, 'id' | 'date'>): Promise<QuizAttempt> => {
    const attemptsRef = collection(db, `users/${uid}/quizAttempts`);
    const newAttempt = { ...attempt, date: new Date().toISOString() };
    const docRef = await addDoc(attemptsRef, newAttempt);
    return { id: docRef.id, ...newAttempt };
};

// --- Admin Panel & App Configuration ---
const getDefaultAppConfig = (): AppConfig => {
    const defaultFeatureAccess: { [key: string]: any } = {};
    Object.keys(TOOLS).forEach(key => {
        defaultFeatureAccess[key] = { enabled: true, minTier: 'free' };
    });
    defaultFeatureAccess.reportCardHelper.minTier = 'silver';
    defaultFeatureAccess.presentationGenerator.minTier = 'silver';
    
    return {
        planPrices: { silver: '₹499/mo', gold: '₹999/mo' },
        aiModels: {
            lessonPlanner: 'gemini-2.5-pro',
            homeworkHelper: 'gemini-2.5-flash-lite',
            topicExplorer: 'gemini-2.5-flash',
            presentationGenerator: 'gemini-2.5-pro',
            quizGenerator: 'gemini-2.5-flash',
            summarizer: 'gemini-2.5-flash',
            factFinder: 'gemini-2.5-flash',
            activityGenerator: 'gemini-2.5-flash-lite',
            reportCardHelper: 'gemini-2.5-flash',
            visualAssistant: 'gemini-2.5-flash',
            imageGeneration: 'gemini-2.5-flash-image',
            tts: 'gemini-2.5-flash-preview-tts',
        },
        featureAccess: defaultFeatureAccess,
        usageLimits: {
            freeTier: { topicSearches: 5, homeworkHelps: 5, summaries: 5, presentations: 3, lessonPlans: 5, activities: 3, quizQuestions: 100 },
            creditCosts: { visualAssistant: 10 }
        },
        superAdmins: SUPER_ADMINS_LIST,
        paymentSettings: { gateways: [{ provider: 'stripe', enabled: true }, { provider: 'cashfree', enabled: true }] },
    };
};

const mergeConfigWithDefaults = (dbConfig: any, defaultConfig: AppConfig): AppConfig => {
    const combinedAdmins = [...new Set([...(dbConfig.superAdmins || []), ...defaultConfig.superAdmins])];
    const featureAccess = JSON.parse(JSON.stringify(defaultConfig.featureAccess));
    if (dbConfig.featureAccess) {
        Object.keys(featureAccess).forEach(key => {
            if (dbConfig.featureAccess[key]) {
                featureAccess[key] = { ...featureAccess[key], ...dbConfig.featureAccess[key] };
            }
        });
    }
    return {
        ...defaultConfig,
        ...dbConfig,
        planPrices: { ...defaultConfig.planPrices, ...dbConfig.planPrices },
        aiModels: { ...defaultConfig.aiModels, ...dbConfig.aiModels },
        featureAccess: featureAccess,
        usageLimits: {
            freeTier: { ...defaultConfig.usageLimits.freeTier, ...dbConfig.usageLimits?.freeTier },
            creditCosts: { ...defaultConfig.usageLimits.creditCosts, ...dbConfig.usageLimits?.creditCosts },
        },
        paymentSettings: { gateways: dbConfig.paymentSettings?.gateways || defaultConfig.paymentSettings.gateways },
        superAdmins: combinedAdmins,
    };
};

export const onAppConfigSnapshot = (callback: (config: AppConfig) => void): Unsubscribe => {
    const defaultConfig = getDefaultAppConfig();
    const configRef = doc(db, 'app-config/global');
    return onSnapshot(configRef, async (snapshot) => {
        if (snapshot.exists()) {
            callback(mergeConfigWithDefaults(snapshot.data(), defaultConfig));
        } else {
            console.log("No app config found, creating one with defaults.");
            try {
                await setDoc(configRef, defaultConfig);
                callback(defaultConfig);
            } catch (error) {
                console.error("Failed to create default app config:", error);
                callback(defaultConfig);
            }
        }
    }, (error) => {
        console.warn("Real-time config listener failed, falling back to local defaults.", error);
        callback(defaultConfig);
    });
};

export const getAllUsers = async (): Promise<(User & { uid: string; subscription: any; settings: any; createdAt: any; isAdmin: boolean; status: 'active' | 'blocked' })[]> => {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const profile = data.profile || {};
        const subscription = data.subscription || {};
        const settings = data.settings || {};
        let createdAtDate = new Date();
        if (profile.createdAt?.toDate) {
            createdAtDate = profile.createdAt.toDate();
        } else if (profile.createdAt) {
            try { createdAtDate = new Date(profile.createdAt); } catch (e) {}
        }
        return {
            uid: doc.id,
            name: profile.name || 'N/A',
            email: profile.email || 'N/A',
            picture: profile.picture || '',
            subscription: subscription,
            settings: settings,
            createdAt: createdAtDate,
            isAdmin: data.isAdmin || false,
            status: data.status || 'active',
        };
    });
};

export const updateAppConfig = async (config: AppConfig) => {
    const configRef = doc(db, 'app-config/global');
    await setDoc(configRef, config, { merge: true });
};

export const getActivityLogs = async (limitCount = 100) => {
    const logsRef = collection(db, 'activityLogs');
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPayments = async (limitCount = 100) => {
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};