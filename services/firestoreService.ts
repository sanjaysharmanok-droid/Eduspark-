import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { User, UserRole, Theme, Language, SubscriptionTier, Usage, LessonList, SavedTopic, QuizAttempt, AppConfig } from '../types';
import { FirebaseUser } from './authService';
import { TOOLS } from '../constants';

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

export const updateUserData = async (uid: string, data: object) => {
  const userRef = doc(db, `users/${uid}`);
  try {
    await updateDoc(userRef, data);
  } catch (error) {
    console.error("Error updating user data:", error);
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
    const snapshot = await getDocs(attemptsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuizAttempt)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const addQuizAttempt = async (uid: string, attempt: Omit<QuizAttempt, 'id' | 'date'>): Promise<QuizAttempt> => {
    const attemptsRef = collection(db, `users/${uid}/quizAttempts`);
    const newAttempt = { ...attempt, date: new Date().toISOString() };
    const docRef = await addDoc(attemptsRef, newAttempt);
    return { id: docRef.id, ...newAttempt };
};

// --- Admin Panel Functions ---

export const getAllUsers = async (): Promise<(User & { uid: string; subscription: any; settings: any; createdAt: any; isAdmin: boolean })[]> => {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({
        uid: doc.id,
        name: doc.data().profile.name,
        email: doc.data().profile.email,
        picture: doc.data().profile.picture,
        subscription: doc.data().subscription,
        settings: doc.data().settings,
        createdAt: doc.data().profile.createdAt.toDate(), // Convert Firestore timestamp to Date
        isAdmin: doc.data().isAdmin || false,
    }));
};

export const getAppConfig = async (): Promise<AppConfig> => {
    const configRef = doc(db, 'app-config/global');
    const snapshot = await getDoc(configRef);

    const defaultFeatureAccess: { [key: string]: any } = {};
    Object.keys(TOOLS).forEach(key => {
        defaultFeatureAccess[key] = { enabled: true, minTier: 'free' };
    });
    // Set premium defaults for certain tools
    defaultFeatureAccess.reportCardHelper.minTier = 'silver';
    defaultFeatureAccess.presentationGenerator.minTier = 'silver';
    
    // Default config if it doesn't exist in Firestore
    const defaultConfig: AppConfig = {
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
            freeTier: {
                topicSearches: 5,
                homeworkHelps: 5,
                summaries: 5,
                presentations: 3,
                lessonPlans: 5,
                activities: 3,
                quizQuestions: 100,
            },
            creditCosts: {
                visualAssistant: 10
            }
        },
        superAdmins: [
            'sanjaysharmanok@gmail.com', // VERY IMPORTANT: Replace this with your Google account email to become the first super admin.
        ],
        paymentSettings: {
            gateways: [
                { provider: 'stripe', enabled: true },
                { provider: 'cashfree', enabled: true },
            ],
        },
    };
    
    if (snapshot.exists()) {
        const dbConfig = snapshot.data();
        
        // Combine superAdmins from the database and the default config in the code.
        // A Set is used to prevent duplicate entries, making the initial admin setup robust.
        const combinedAdmins = [...new Set([...(dbConfig.superAdmins || []), ...defaultConfig.superAdmins])];

        // Deep merge snapshot data with default config to ensure all keys are present
        const mergedConfig = {
            ...defaultConfig,
            ...dbConfig,
            planPrices: { ...defaultConfig.planPrices, ...dbConfig.planPrices },
            aiModels: { ...defaultConfig.aiModels, ...dbConfig.aiModels },
            featureAccess: { ...defaultConfig.featureAccess, ...dbConfig.featureAccess },
            usageLimits: {
                ...defaultConfig.usageLimits,
                freeTier: { ...defaultConfig.usageLimits.freeTier, ...dbConfig.usageLimits?.freeTier },
                creditCosts: { ...defaultConfig.usageLimits.creditCosts, ...dbConfig.usageLimits?.creditCosts },
            },
            paymentSettings: {
                ...defaultConfig.paymentSettings,
                gateways: dbConfig.paymentSettings?.gateways || defaultConfig.paymentSettings.gateways,
            },
            superAdmins: combinedAdmins, // Use the more robust combined list.
        };
        return mergedConfig as AppConfig;
    } else {
        // If no config exists, create one with the default values
        await setDoc(configRef, defaultConfig);
        return defaultConfig;
    }
};

export const updateAppConfig = async (config: AppConfig) => {
    const configRef = doc(db, 'app-config/global');
    // Using set with merge true is okay here because the admin panel sends the whole config object.
    await setDoc(configRef, config, { merge: true });
};