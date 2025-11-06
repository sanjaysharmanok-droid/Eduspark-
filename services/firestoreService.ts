import { doc, getDoc, setDoc, updateDoc, collection, getDocs, addDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { User, UserRole, Theme, Language, SubscriptionTier, Usage, LessonList, SavedTopic, QuizAttempt } from '../types';
import { FirebaseUser } from './authService';

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

export const getIsAdmin = async (uid: string): Promise<boolean> => {
    const userData = await getUserData(uid);
    return userData?.isAdmin === true;
};

export const getAllUsers = async (): Promise<(User & { uid: string; subscription: any; settings: any; createdAt: any })[]> => {
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
    }));
};

export const getAppConfig = async (): Promise<any> => {
    const configRef = doc(db, 'app-config/global');
    const snapshot = await getDoc(configRef);
    if (snapshot.exists()) {
        return snapshot.data();
    }
    // Return default config if it doesn't exist
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
        },
    };
};

export const updateAppConfig = async (data: object) => {
    const configRef = doc(db, 'app-config/global');
    try {
        await setDoc(configRef, data, { merge: true });
    } catch (error) {
        console.error("Error updating app config:", error);
    }
};