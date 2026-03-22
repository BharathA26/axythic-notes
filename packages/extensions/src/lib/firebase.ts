import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  indexedDBLocalPersistence,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth/web-extension';

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

// IMPORTANT: Use initializeAuth instead of getAuth for Chrome extension compatibility.
// getAuth() includes BrowserPopupRedirectResolver which references `document` and `window` —
// these don't exist in Chrome MV3 service workers and cause "Service worker registration failed".
// indexedDBLocalPersistence works in both service workers AND popup/content script contexts.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence],
});

// ─── Google Sign-In via chrome.identity ──────────────────────────────────────

/**
 * Sign in using Chrome's identity API (no popup required).
 * Requires the `oauth2` section in manifest.json with a valid client_id.
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

// ─── Email / Password Sign-In ────────────────────────────────────────────────

/**
 * Sign in with email and password using Firebase Auth.
 * Returns the signed-in Firebase user.
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

// ─── Sign Out ────────────────────────────────────────────────────────────────

/**
 * Signs out of Firebase Auth and revokes the chrome.identity token (if any).
 */
export async function signOut(): Promise<void> {
  // Revoke chrome.identity token so the next Google sign-in shows the picker
  try {
    const token = await new Promise<string | undefined>((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, resolve);
    });
    if (token) {
      await new Promise<void>((resolve) => {
        chrome.identity.removeCachedAuthToken({ token }, resolve);
      });
    }
  } catch {
    // ignore — user may not have used Google sign-in
  }

  await firebaseSignOut(auth);
}

// ─── Token & Auth Helpers ────────────────────────────────────────────────────

/**
 * Get the current Firebase ID token (JWT).
 * Returns null if not signed in (does NOT auto-trigger sign-in).
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken(/* forceRefresh */ true);
  } catch {
    return null;
  }
}

/**
 * Get the current Firebase user (synchronous snapshot).
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Serialize the current user into a plain object for message passing.
 */
export function serializeUser(user: User | null) {
  if (!user) return null;
  return {
    uid:         user.uid,
    email:       user.email,
    displayName: user.displayName,
    photoURL:    user.photoURL,
  };
}

/** Subscribe to auth state changes */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
