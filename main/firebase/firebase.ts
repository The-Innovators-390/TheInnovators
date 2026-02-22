import Constants from "expo-constants";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  type Auth,
  type Persistence,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

// getReactNativePersistence lives in the React-Native bundle of @firebase/auth
// (dist/rn/index.js). Metro resolves 'firebase/auth' to the browser CJS bundle
// whose TypeScript types don't declare it, so we require the inner package
// directly where the RN types DO declare it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require("@firebase/auth") as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

const {
  firebaseApiKey,
  firebaseAuthDomain,
  firebaseProjectId,
  firebaseStorageBucket,
  firebaseMessagingSenderId,
  firebaseAppId,
} = Constants.expoConfig?.extra ?? {};

const firebaseConfig = {
  apiKey: firebaseApiKey,
  authDomain: firebaseAuthDomain,
  projectId: firebaseProjectId,
  storageBucket: firebaseStorageBucket,
  messagingSenderId: firebaseMessagingSenderId,
  appId: firebaseAppId,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Persist auth sessions to AsyncStorage so they survive Expo JS reloads and
// full app restarts. Fall back to getAuth() if initializeAuth was already
// called on this app instance (can happen with Fast Refresh).
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
