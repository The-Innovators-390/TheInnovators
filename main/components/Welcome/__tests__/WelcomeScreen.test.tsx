import React from "react";
import { Alert, ActivityIndicator } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import WelcomeScreen from "@/components/Welcome/WelcomeScreen";
import { googleAuthFacade } from "@/services/google/facades/GoogleAuthFacade";
import { router } from "expo-router";

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock("@/services/google/facades/GoogleAuthFacade", () => ({
  googleAuthFacade: {
    configure: jest.fn(),
    signIn: jest.fn(),
  },
}));

describe("WelcomeScreen", () => {
  const replaceMock = router.replace as jest.Mock;
  const configureMock = googleAuthFacade.configure as jest.Mock;
  const signInMock = googleAuthFacade.signIn as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(console, "log").mockImplementation(jest.fn());
    configureMock.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("navigates to map when continuing as guest", () => {
    const { getByTestId } = render(<WelcomeScreen />);

    fireEvent.press(getByTestId("guest-sign-in-button"));

    expect(replaceMock).toHaveBeenCalledWith("/(tabs)/map");
  });

  it("navigates to map when Google sign-in succeeds", async () => {
    signInMock.mockResolvedValue(undefined);

    const { getByTestId } = render(<WelcomeScreen />);

    fireEvent.press(getByTestId("google-sign-in-button"));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalled();
      expect(replaceMock).toHaveBeenCalledWith("/(tabs)/map");
    });
  });

  it("shows alert when Google sign-in fails with a message", async () => {
    signInMock.mockRejectedValue(new Error("User cancelled"));

    const { getByTestId } = render(<WelcomeScreen />);

    fireEvent.press(getByTestId("google-sign-in-button"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Google Sign-In failed",
        "User cancelled",
      );
    });
  });

  it("shows fallback alert when Google sign-in fails without a message", async () => {
    signInMock.mockRejectedValue({});

    const { getByTestId } = render(<WelcomeScreen />);

    fireEvent.press(getByTestId("google-sign-in-button"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Google Sign-In failed",
        "Sign-in was cancelled or failed.",
      );
    });
  });

  it("shows alert when configure fails", () => {
    configureMock.mockImplementation(() => {
      throw new Error("Config error");
    });

    render(<WelcomeScreen />);

    expect(Alert.alert).toHaveBeenCalledWith("Config error", "Config error");
  });

  it("shows loading indicator while sign-in is in progress", async () => {
    let resolvePromise!: () => void;

    signInMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    const { getByTestId, UNSAFE_getByType } = render(<WelcomeScreen />);

    fireEvent.press(getByTestId("google-sign-in-button"));

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

    resolvePromise();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/(tabs)/map");
    });
  });
});
