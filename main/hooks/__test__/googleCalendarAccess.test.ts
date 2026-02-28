import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

jest.mock("@/firebase/firebase", () => ({
  auth: { signOut: jest.fn() },
}));

jest.mock("firebase/auth", () => ({
  GoogleAuthProvider: { credential: jest.fn() },
  signInWithCredential: jest.fn(),
}));

import {
  isGoogleSignedIn,
  markGoogleCalendarDisconnected,
  requestGoogleCalendarAccess,
  isGoogleCalendarConnected,
  // added exports to cover more branches
  configureGoogleSignIn,
  signInWithGoogle,
  signOutGoogle,
} from "@/hooks/useGoogleAuth";

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      googleWebClientId: "web-client-id.apps.googleusercontent.com",
      googleIosClientId: "ios-client-id.apps.googleusercontent.com",
    },
  },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(), 
    hasPlayServices: jest.fn(), 
    getCurrentUser: jest.fn(),
    addScopes: jest.fn(),
    signInSilently: jest.fn(),
    signIn: jest.fn(),
    getTokens: jest.fn(),
    signOut: jest.fn(), 
  },
}));

// allow controlling Platform.OS for android branch
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

// to assert signOut/auth flows
import { auth } from "@/firebase/firebase";
import { Platform } from "react-native";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

describe("useGoogleAuth – calendar helpers", () => {
  const getCurrentUserMock =
    GoogleSignin.getCurrentUser as unknown as jest.MockedFunction<any>;
  const addScopesMock =
    GoogleSignin.addScopes as unknown as jest.MockedFunction<any>;
  const signInSilentlyMock =
    GoogleSignin.signInSilently as unknown as jest.MockedFunction<any>;
  const signInMock = GoogleSignin.signIn as unknown as jest.MockedFunction<any>;
  const getTokensMock =
    GoogleSignin.getTokens as unknown as jest.MockedFunction<any>;

  // added mocks for new branches
  const configureMock =
    GoogleSignin.configure as unknown as jest.MockedFunction<any>;
  const hasPlayServicesMock =
    GoogleSignin.hasPlayServices as unknown as jest.MockedFunction<any>;
  const signOutMock =
    GoogleSignin.signOut as unknown as jest.MockedFunction<any>;

  beforeEach(async () => {
    jest.clearAllMocks();
    await (AsyncStorage as any).clear?.();
    (global.fetch as any) = undefined;
    // reset OS between tests
    (Platform as any).OS = "ios";
  });

  it("isGoogleSignedIn returns true when a user exists", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ user: { email: "a@b.com" } });

    await expect(isGoogleSignedIn()).resolves.toBe(true);
  });

  it("isGoogleSignedIn returns false when no user", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    await expect(isGoogleSignedIn()).resolves.toBe(false);
  });

  it("markGoogleCalendarDisconnected sets connected=false", async () => {
    await markGoogleCalendarDisconnected();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "google_calendar_connected",
      "false",
    );
  });

  it("isGoogleCalendarConnected reads storage", async () => {
    await AsyncStorage.setItem("google_calendar_connected", "true");
    await expect(isGoogleCalendarConnected()).resolves.toBe(true);

    await AsyncStorage.setItem("google_calendar_connected", "false");
    await expect(isGoogleCalendarConnected()).resolves.toBe(false);
  });

  it("requestGoogleCalendarAccess throws NOT_SIGNED_IN when no current user", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    await expect(requestGoogleCalendarAccess()).rejects.toThrow("NOT_SIGNED_IN");
  });

  it("requestGoogleCalendarAccess returns token and marks connected=true on success", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    addScopesMock.mockResolvedValueOnce(undefined);
    signInSilentlyMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ accessToken: "access-123" });

    const fetchMock = jest.fn() as jest.MockedFunction<any>;
    global.fetch = fetchMock as any;

    // tokeninfo
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scope: "https://www.googleapis.com/auth/calendar.readonly",
      }),
    });

    // calendar verify OK
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const token = await requestGoogleCalendarAccess();

    expect(token).toBe("access-123");
    expect(addScopesMock).toHaveBeenCalledWith({
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "google_calendar_connected",
      "true",
    );
  });

  it("requestGoogleCalendarAccess falls back to signIn when signInSilently fails", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    addScopesMock.mockResolvedValueOnce(undefined);
    signInSilentlyMock.mockRejectedValueOnce(new Error("silent failed"));
    signInMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ accessToken: "access-456" });

    const fetchMock = jest.fn() as jest.MockedFunction<any>;
    global.fetch = fetchMock as any;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ scope: "" }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const token = await requestGoogleCalendarAccess();
    expect(token).toBe("access-456");
    expect(signInMock).toHaveBeenCalledTimes(1);
  });

  it("requestGoogleCalendarAccess throws when accessToken missing", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    addScopesMock.mockResolvedValueOnce(undefined);
    signInSilentlyMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ accessToken: null });

    await expect(requestGoogleCalendarAccess()).rejects.toThrow(
      "Google Calendar: missing accessToken",
    );
  });

  it("requestGoogleCalendarAccess on 403 marks disconnected and throws CALENDAR_PERMISSION_MISSING", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    addScopesMock.mockResolvedValueOnce(undefined);
    signInSilentlyMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ accessToken: "access-denied" });

    const fetchMock = jest.fn() as jest.MockedFunction<any>;
    global.fetch = fetchMock as any;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        scope: "https://www.googleapis.com/auth/calendar.readonly",
      }),
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          status: "PERMISSION_DENIED",
          message: "Not authorized",
          errors: [{ reason: "forbidden" }],
        },
      }),
    });

    await expect(requestGoogleCalendarAccess()).rejects.toThrow(
      /CALENDAR_PERMISSION_MISSING/,
    );

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "google_calendar_connected",
      "false",
    );
  });

  // ------------------------------------------------------------------
  // ✅ ADD-ONS BELOW (keeps your existing tests intact)
  // ------------------------------------------------------------------

  it("configureGoogleSignIn configures GoogleSignin with empty scopes", () => {
    configureGoogleSignIn();

    expect(configureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: [],
      }),
    );
  });

  it("signInWithGoogle (android) calls hasPlayServices and signs in with credential", async () => {
    (Platform as any).OS = "android";

    hasPlayServicesMock.mockResolvedValueOnce(true);
    signInMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ idToken: "id-123" });

    await signInWithGoogle();

    expect(hasPlayServicesMock).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: true,
    });
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith("id-123");
    expect(signInWithCredential).toHaveBeenCalledTimes(1);
  });

  it("signInWithGoogle (ios) does NOT call hasPlayServices", async () => {
    (Platform as any).OS = "ios";

    signInMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ idToken: "id-456" });

    await signInWithGoogle();

    expect(hasPlayServicesMock).not.toHaveBeenCalled();
    expect(signInMock).toHaveBeenCalledTimes(1);
  });

  it("signInWithGoogle throws when idToken missing", async () => {
    signInMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ idToken: null });

    await expect(signInWithGoogle()).rejects.toThrow(
      "Google Sign-In: missing idToken",
    );
  });

  it("requestGoogleCalendarAccess: tokeninfo fetch throws (covers scopeInfo catch)", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    addScopesMock.mockResolvedValueOnce(undefined);
    signInSilentlyMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ accessToken: "access-789" });

    const fetchMock = jest.fn() as jest.MockedFunction<any>;
    global.fetch = fetchMock as any;

    // tokeninfo throws -> scopeInfo becomes ""
    fetchMock.mockRejectedValueOnce(new Error("network"));

    // calendar verify OK
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const token = await requestGoogleCalendarAccess();
    expect(token).toBe("access-789");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "google_calendar_connected",
      "true",
    );
  });

  it("requestGoogleCalendarAccess on 401 uses HTTP status fallback when response json throws", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    addScopesMock.mockResolvedValueOnce(undefined);
    signInSilentlyMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ accessToken: "access-401" });

    const fetchMock = jest.fn() as jest.MockedFunction<any>;
    global.fetch = fetchMock as any;

    // tokeninfo returns no calendar scope -> HasScope false
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ scope: "profile email" }),
    });

    // calendar verify !ok and json throws => errText = HTTP 401
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => {
        throw new Error("bad json");
      },
    });

    await expect(requestGoogleCalendarAccess()).rejects.toThrow(
      /CALENDAR_PERMISSION_MISSING/,
    );

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "google_calendar_connected",
      "false",
    );
  });

  it("signOutGoogle signs out, clears storage, and re-configures default config", async () => {
    signOutMock.mockResolvedValueOnce(undefined);
    (auth.signOut as unknown as jest.MockedFunction<any>).mockResolvedValueOnce(
      undefined,
    );

    await signOutGoogle();

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      "google_calendar_connected",
      "google_calendar_access_token",
    ]);

    // signOutGoogle calls doConfigure([]) -> configure called with scopes: []
    expect(configureMock).toHaveBeenCalledWith(
      expect.objectContaining({ scopes: [] }),
    );
  });

    it("requestGoogleCalendarAccess: non-401/403 non-ok response parses Google error json but does not throw", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    addScopesMock.mockResolvedValueOnce(undefined);
    signInSilentlyMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ accessToken: "access-500" });

    const fetchMock = jest.fn() as jest.MockedFunction<any>;
    global.fetch = fetchMock as any;

    // tokeninfo ok (scope can be anything)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ scope: "" }),
    });

    // calendar verify NOT ok, status 500 (or 400), json SUCCESS -> covers errText assembly branch
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: {
          status: "INTERNAL",
          message: "Server error",
          errors: [{ reason: "backendError" }],
        },
      }),
    });

    // Function should NOT throw (only throws on 401/403)
    const token = await requestGoogleCalendarAccess();
    expect(token).toBe("access-500");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "google_calendar_connected",
      "true",
    );
  });

  it("requestGoogleCalendarAccess: tokeninfo ok but calendar verify ok=false and json throws on non-401/403 uses HTTP fallback and still succeeds", async () => {
    getCurrentUserMock.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    addScopesMock.mockResolvedValueOnce(undefined);
    signInSilentlyMock.mockResolvedValueOnce(undefined);
    getTokensMock.mockResolvedValueOnce({ accessToken: "access-400" });

    const fetchMock = jest.fn() as jest.MockedFunction<any>;
    global.fetch = fetchMock as any;

    // tokeninfo ok
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ scope: "" }),
    });

    // calendar verify NOT ok, status 400, json throws -> covers errText = `HTTP ${status}` catch branch
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => {
        throw new Error("bad json");
      },
    });

    // still no throw (not 401/403)
    const token = await requestGoogleCalendarAccess();
    expect(token).toBe("access-400");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "google_calendar_connected",
      "true",
    );
  });
});