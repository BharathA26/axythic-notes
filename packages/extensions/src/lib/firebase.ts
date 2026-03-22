import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

// These values are safe to include in the extension (public config).
// The private key / service account is NEVER in the extension.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

/**
 * Sign in using Chrome's identity API (no popup required).
 * Returns the signed-in Firebase user.
 */
export async function signInWithChrome(): Promise<User> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (googleToken) => {
      if (chrome.runtime.lastError || !googleToken) {
        reject(chrome.runtime.lastError?.message || 'Failed to get Google token');
        return;
      }

      try {
        const credential = GoogleAuthProvider.credential(null, googleToken);
        const result     = await signInWithCredential(auth, credential);
        resolve(result.user);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Get the current Firebase ID token (JWT).
 * Automatically refreshes if expired.
 * If not signed in, triggers sign-in first.
 */
export async function getIdToken(): Promise<string | null> {
  let user = auth.currentUser;

  if (!user) {
    try {
      user = await signInWithChrome();
    } catch {
      return null;
    }
  }

  try {
    return await user.getIdToken(/* forceRefresh */ true);
  } catch {
    return null;
  }
}

/** Subscribe to auth state changes */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
