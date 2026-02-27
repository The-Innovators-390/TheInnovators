import { describe, it, expect, jest, beforeEach } from "@jest/globals";

import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import {
  configureGoogleSignIn,
  signInWithGoogle,
  signOutGoogle,
} from "@/hooks/useGoogleAuth";
import { auth } from "@/firebase/firebase";
jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      googleWebClientId: "web-client-id.apps.googleusercontent.com",
      googleIosClientId: "ios-client-id.apps.googleusercontent.com",
    },
  },
}));

jest.mock("@/firebase/firebase", () => ({
  auth: {
    signOut: jest.fn(),
  },
}));

// 3) Mock GoogleSignin SDK
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    getTokens: jest.fn(),
    signOut: jest.fn(),
  },
}));

// 4) Mock Firebase auth helpers
jest.mock("firebase/auth", () => ({
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
  signInWithCredential: jest.fn(),
}));

describe("googleSignIn service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("configureGoogleSignIn calls GoogleSignin.configure with webClientId and iosClientId", () => {
    configureGoogleSignIn();

    expect(GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: "web-client-id.apps.googleusercontent.com",
      iosClientId: "ios-client-id.apps.googleusercontent.com",
      scopes: [],
    });
  });

  it("signInWithGoogle signs in and exchanges idToken for Firebase credential", async () => {
    const mockHasPlayServices =
      GoogleSignin.hasPlayServices as unknown as jest.MockedFunction<
        typeof GoogleSignin.hasPlayServices
      >;
    const mockSignIn = GoogleSignin.signIn as unknown as jest.MockedFunction<
      typeof GoogleSignin.signIn
    >;
    const mockGetTokens =
      GoogleSignin.getTokens as unknown as jest.MockedFunction<
        typeof GoogleSignin.getTokens
      >;

    mockHasPlayServices.mockResolvedValueOnce(true as any);
    mockSignIn.mockResolvedValueOnce({} as any);
    mockGetTokens.mockResolvedValueOnce({ idToken: "test-id-token" } as any);

    const mockCredential =
      GoogleAuthProvider.credential as unknown as jest.MockedFunction<
        typeof GoogleAuthProvider.credential
      >;
    mockCredential.mockReturnValueOnce("mockFirebaseCredential" as any);

    const mockSignInWithCredential =
      signInWithCredential as unknown as jest.MockedFunction<
        typeof signInWithCredential
      >;
    mockSignInWithCredential.mockResolvedValueOnce({
      user: { uid: "123" },
    } as any);

    const res = await signInWithGoogle();

    if (Platform.OS === "android") {
      expect(GoogleSignin.hasPlayServices).toHaveBeenCalledWith({
        showPlayServicesUpdateDialog: true,
      });
    } else {
      expect(GoogleSignin.hasPlayServices).not.toHaveBeenCalled();
    }

    expect(GoogleSignin.signIn).toHaveBeenCalledTimes(1);
    expect(GoogleSignin.getTokens).toHaveBeenCalledTimes(1);

    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith("test-id-token");
    expect(signInWithCredential).toHaveBeenCalledWith(
      expect.anything(),
      "mockFirebaseCredential",
    );

    expect(res).toEqual({ user: { uid: "123" } });
  });

  it("signInWithGoogle throws if idToken is missing", async () => {
    const mockHasPlayServices =
      GoogleSignin.hasPlayServices as unknown as jest.MockedFunction<
        typeof GoogleSignin.hasPlayServices
      >;

    const mockSignIn = GoogleSignin.signIn as unknown as jest.MockedFunction<
      typeof GoogleSignin.signIn
    >;

    const mockGetTokens =
      GoogleSignin.getTokens as unknown as jest.MockedFunction<
        typeof GoogleSignin.getTokens
      >;

    mockHasPlayServices.mockResolvedValueOnce(true as any);
    mockSignIn.mockResolvedValueOnce({} as any);
    mockGetTokens.mockResolvedValueOnce({ idToken: null } as any);

    await expect(signInWithGoogle()).rejects.toThrow("missing idToken");
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it("signOutGoogle signs out from Google + Firebase auth", async () => {
    const mockGoogleSignOut =
      GoogleSignin.signOut as unknown as jest.MockedFunction<
        typeof GoogleSignin.signOut
      >;

    mockGoogleSignOut.mockResolvedValueOnce(undefined as any);

    await signOutGoogle();

    expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});
