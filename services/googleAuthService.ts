import { User } from '../types';

// This service now integrates with Google's Identity Services SDK.
declare const google: any; // Inform TypeScript about the global 'google' object from the GSI script

export const CLIENT_ID = "107395952282-2g7hj5cph4gmsomdjf138incu8al0nt3.apps.googleusercontent.com";

/**
 * Decodes the JWT token from Google Sign-In to get user profile.
 * @param token The JWT credential string.
 * @returns The user's profile information.
 */
export function decodeJwtResponse(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Error decoding JWT", error);
        return null;
    }
}

export const signOut = async (): Promise<void> => {
  console.log('Signing out from Google...');
  if (typeof google !== 'undefined') {
      // This prevents the One Tap prompt from showing automatically on the next visit.
      google.accounts.id.disableAutoSelect();
  }
  console.log('Sign-Out successful.');
  // The AppContext handles clearing local user state.
  return Promise.resolve();
};
