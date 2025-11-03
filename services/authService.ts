import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { User } from '../types';

export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user) {
        return {
            name: user.displayName || 'Anonymous',
            email: user.email || '',
            picture: user.photoURL || '',
        };
    }
    return null;
  } catch (error) {
    console.error("Error during Google sign-in:", error);
    // You might want to handle specific errors here, like 'auth/popup-closed-by-user'
    return null;
  }
};

export const signOut = (): Promise<void> => {
  return firebaseSignOut(auth);
};

// Pass through the onAuthStateChanged listener and FirebaseUser type for use in the context.
export { onAuthStateChanged };
export type { FirebaseUser };
