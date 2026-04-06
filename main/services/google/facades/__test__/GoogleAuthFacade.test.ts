import { googleAuthFacade } from "@/services/google/facades/GoogleAuthFacade";
import {
  configureGoogleSignIn,
  signInWithGoogle,
  signOutGoogle,
  isGoogleSignedIn,
} from "@/hooks/useGoogleAuth";

jest.mock("@/hooks/useGoogleAuth", () => ({
  configureGoogleSignIn: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOutGoogle: jest.fn(),
  isGoogleSignedIn: jest.fn(),
}));

describe("GoogleAuthFacade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("configure delegates to configureGoogleSignIn", () => {
    googleAuthFacade.configure();

    expect(configureGoogleSignIn).toHaveBeenCalledTimes(1);
  });

  it("signIn delegates to signInWithGoogle and returns current status", async () => {
    (signInWithGoogle as jest.Mock).mockResolvedValue(undefined);
    (isGoogleSignedIn as jest.Mock).mockResolvedValue(true);

    const result = await googleAuthFacade.signIn();

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(isGoogleSignedIn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ signedIn: true });
  });

  it("signOut delegates to signOutGoogle", async () => {
    (signOutGoogle as jest.Mock).mockResolvedValue(undefined);

    await googleAuthFacade.signOut();

    expect(signOutGoogle).toHaveBeenCalledTimes(1);
  });

  it("getStatus returns signedIn true when user is signed in", async () => {
    (isGoogleSignedIn as jest.Mock).mockResolvedValue(true);

    const result = await googleAuthFacade.getStatus();

    expect(isGoogleSignedIn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ signedIn: true });
  });

  it("getStatus returns signedIn false when user is not signed in", async () => {
    (isGoogleSignedIn as jest.Mock).mockResolvedValue(false);

    const result = await googleAuthFacade.getStatus();

    expect(result).toEqual({ signedIn: false });
  });

  it("isSignedIn delegates to isGoogleSignedIn", async () => {
    (isGoogleSignedIn as jest.Mock).mockResolvedValue(true);

    const result = await googleAuthFacade.isSignedIn();

    expect(isGoogleSignedIn).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it("propagates signIn errors", async () => {
    (signInWithGoogle as jest.Mock).mockRejectedValue(
      new Error("signin failed"),
    );

    await expect(googleAuthFacade.signIn()).rejects.toThrow("signin failed");
  });
});
