import Constants from "expo-constants";
import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "@/firebase/firebase";

const { googleWebClientId, googleIosClientId } =
  Constants.expoConfig?.extra ?? {};

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

const CALENDAR_CONNECTED_KEY = "google_calendar_connected";
const CALENDAR_TOKEN_KEY = "google_calendar_access_token";

function doConfigure(scopes?: string[]) {
  if (!googleWebClientId)
    throw new Error("Missing googleWebClientId in expo.extra");

  GoogleSignin.configure({
    webClientId: googleWebClientId,
    iosClientId: googleIosClientId,
    scopes: scopes ?? [], // key part
  });
}

export function configureGoogleSignIn() {
  // default config (no calendar scope)
  doConfigure([]);
}

export async function signInWithGoogle() {
  // hasPlayServices is Android-only
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  await GoogleSignin.signIn();

  const { idToken } = await GoogleSignin.getTokens();
  if (!idToken) throw new Error("Google Sign-In: missing idToken");

  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
}

export async function isGoogleSignedIn() {
  const gUser = await GoogleSignin.getCurrentUser();
  return !!gUser;
}

export async function markGoogleCalendarDisconnected() {
  await AsyncStorage.setItem(CALENDAR_CONNECTED_KEY, "false");
}

export async function requestGoogleCalendarAccess() {
  const currentUser = await GoogleSignin.getCurrentUser();
  if (!currentUser) throw new Error("NOT_SIGNED_IN");

  // Ask for calendar scope
  await GoogleSignin.addScopes({ scopes: [CALENDAR_SCOPE] });

  // Force token refresh
  try {
    await GoogleSignin.signInSilently();
  } catch {
    await GoogleSignin.signIn();
  }

  const { accessToken } = await GoogleSignin.getTokens();
  if (!accessToken) throw new Error("Google Calendar: missing accessToken");

  // Debug token scopes (this endpoint is super useful)
  let scopeInfo = "";
  try {
    const tokenInfoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`,
    );
    const tokenInfoJson: any = await tokenInfoRes.json();
    scopeInfo = tokenInfoJson?.scope ?? "";
  } catch {
    scopeInfo = "";
  }

  // Verify permission via Calendar API
  const timeMin = new Date().toISOString();
  const testUrl =
    "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
    `?timeMin=${encodeURIComponent(timeMin)}` +
    "&maxResults=1" +
    "&singleEvents=true" +
    "&orderBy=startTime";

  const testRes = await fetch(testUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let errText = "";
  if (!testRes.ok) {
    try {
      const j: any = await testRes.json();
      const msg = j?.error?.message ?? "";
      const reason = j?.error?.errors?.[0]?.reason ?? "";
      const status = j?.error?.status ?? "";
      errText = [status, reason, msg].filter(Boolean).join(" | ");
    } catch {
      errText = `HTTP ${testRes.status}`;
    }
  }

  // If it failed, mark disconnected and throw WITH the real reason
  if (testRes.status === 401 || testRes.status === 403) {
    await AsyncStorage.setItem(CALENDAR_CONNECTED_KEY, "false");

    const hasCalendarScope = scopeInfo.includes(CALENDAR_SCOPE);

    throw new Error(
      `CALENDAR_PERMISSION_MISSING\n` +
        `HTTP: ${testRes.status}\n` +
        `HasScope: ${hasCalendarScope}\n` +
        `Scopes: ${scopeInfo || "(none)"}\n` +
        `GoogleError: ${errText || "(none)"}`,
    );
  }

  await AsyncStorage.setItem(CALENDAR_CONNECTED_KEY, "true");
  return accessToken;
}

export async function isGoogleCalendarConnected() {
  const v = await AsyncStorage.getItem(CALENDAR_CONNECTED_KEY);
  return v === "true";
}

export async function signOutGoogle() {
  await GoogleSignin.signOut();
  await auth.signOut();
  await AsyncStorage.multiRemove([CALENDAR_CONNECTED_KEY, CALENDAR_TOKEN_KEY]);

  // return to default config after sign-out
  doConfigure([]);
}
