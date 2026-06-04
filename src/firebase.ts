import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, 
  getDocs, onSnapshot, query, where, addDoc, deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile, Group, PartListing, Project, Expense } from './types';

// Establish if Firebase configuration is fully declared
export const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0);

let app;
export let db: any = null;
export let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    console.info("⚡ Real Firebase Initialized Successfully!");
  } catch (error) {
    console.error("❌ Failed to initialize real Firebase SDK:", error);
  }
} else {
  console.warn("⚠️ Firebase configuration keys are empty. Falling back to Mock Sandbox Firebase Engine for interactive testing.");
}

// ------------------------------------------------------------
// MANDATORY FIRESTORE ERROR HANDLER FROM SKILL.MD
// ------------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Security / Operation Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ------------------------------------------------------------
// GOOGLE AUTH UTILS
// ------------------------------------------------------------
export const googleSignIn = async (): Promise<any> => {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured yet. Please enter configuration credentials.");
  }
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error("Google Auth SignIn Error:", err);
    throw err;
  }
};

export const googleSignOut = async (): Promise<void> => {
  if (!isFirebaseConfigured) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Google Auth SignOut Error:", err);
    throw err;
  }
};

// ------------------------------------------------------------
// DB SYNC SERVICE LAYER WITH GENTLE FALLBACKS
// ------------------------------------------------------------

// A. Users Persistence
export const dbSaveUser = async (profile: UserProfile): Promise<void> => {
  if (!isFirebaseConfigured) {
    // In Mock mode, handled in local state / local storage
    return;
  }
  const pathForWrite = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, "users", profile.uid), profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForWrite);
  }
};

export const dbGetUser = async (uid: string): Promise<UserProfile | null> => {
  if (!isFirebaseConfigured) return null;
  const pathForGet = `users/${uid}`;
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathForGet);
    return null;
  }
};

export const dbUpdateUserPermission = async (uid: string, role: UserProfile['role'], status: UserProfile['status']): Promise<void> => {
  if (!isFirebaseConfigured) return;
  const pathForUpdate = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), { role, status });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForUpdate);
  }
};

// B. Collections Sync Handlers
export const syncCollection = <T>(
  collectionName: string,
  onUpdate: (data: T[]) => void,
  onError?: (err: any) => void
): (() => void) => {
  if (!isFirebaseConfigured) {
    return () => {}; // No-op for mock fallback
  }
  
  const q = collection(db, collectionName);
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items: T[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as any as T);
    });
    onUpdate(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, collectionName);
    if (onError) onError(error);
  });
  
  return unsubscribe;
};

// Save record
export const dbSaveRecord = async (collectionName: string, id: string, data: any): Promise<void> => {
  if (!isFirebaseConfigured) return;
  const path = `${collectionName}/${id}`;
  try {
    await setDoc(doc(db, collectionName, id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Delete record
export const dbDeleteRecord = async (collectionName: string, id: string): Promise<void> => {
  if (!isFirebaseConfigured) return;
  const path = `${collectionName}/${id}`;
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
