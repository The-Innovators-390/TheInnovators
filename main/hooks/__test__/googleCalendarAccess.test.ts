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
    getCurrentUser: jest.fn(),
    addScopes: jest.fn(),
    signInSilently: jest.fn(),
    signIn: jest.fn(),
    getTokens: jest.fn(),
  },
}));

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

  beforeEach(async () => {
    jest.clearAllMocks();
    await (AsyncStorage as any).clear?.();
    (global.fetch as any) = undefined;
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

    await expect(requestGoogleCalendarAccess()).rejects.toThrow(
      "NOT_SIGNED_IN",
    );
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
});
