import {
  configureGoogleSignIn,
  signInWithGoogle,
  signOutGoogle,
  isGoogleSignedIn,
} from "@/hooks/useGoogleAuth";

export type GoogleAuthStatus = {
  signedIn: boolean;
};

export class GoogleAuthFacade {
  configure(): void {
    configureGoogleSignIn();
  }

  async signIn(): Promise<GoogleAuthStatus> {
    await signInWithGoogle();
    return this.getStatus();
  }

  async signOut(): Promise<void> {
    await signOutGoogle();
  }

  async getStatus(): Promise<GoogleAuthStatus> {
    const signedIn = await isGoogleSignedIn();
    return { signedIn };
  }

  async isSignedIn(): Promise<boolean> {
    return isGoogleSignedIn();
  }
}

export const googleAuthFacade = new GoogleAuthFacade();
