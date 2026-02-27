import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import CalendarScreen from "@/app/(tabs)/calendar";

let mockIsFocused = true;

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

const mockGetCurrentUser = jest.fn();
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  },
}));

const mockConfigure = jest.fn();
const mockSignIn = jest.fn();
const mockRequestAccess = jest.fn();
const mockIsConnected = jest.fn();

jest.mock("@/hooks/useGoogleAuth", () => ({
  configureGoogleSignIn: (...args: any[]) => mockConfigure(...args),
  signInWithGoogle: (...args: any[]) => mockSignIn(...args),
  requestGoogleCalendarAccess: (...args: any[]) => mockRequestAccess(...args),
  isGoogleCalendarConnected: (...args: any[]) => mockIsConnected(...args),
}));

const mockFetchUpcoming = jest.fn();
jest.mock("@/services/googleCalendar", () => ({
  fetchUpcomingCalendarEvents: (...args: any[]) => mockFetchUpcoming(...args),
}));

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("CalendarScreen", () => {
  const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
  });

  test("renders Not logged in UI when user is null", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    mockIsConnected.mockResolvedValueOnce(false);

    const { findByText } = render(<CalendarScreen />);

    expect(await findByText("Not logged in!")).toBeTruthy();
    expect(await findByText("Sign in with Google")).toBeTruthy();
    expect(await findByText("Return to map")).toBeTruthy();
  });

  test("Sign in button calls signInWithGoogle then refreshes state", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    mockIsConnected.mockResolvedValueOnce(false);

    const { findByText } = render(<CalendarScreen />);
    const btn = await findByText("Sign in with Google");

    mockSignIn.mockResolvedValueOnce(undefined);

    // refreshState after sign-in
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(false);

    fireEvent.press(btn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
  });

  test("Sign in error shows alert", async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);
    mockIsConnected.mockResolvedValueOnce(false);

    const { findByText } = render(<CalendarScreen />);
    const btn = await findByText("Sign in with Google");

    mockSignIn.mockRejectedValueOnce(new Error("boom"));
    fireEvent.press(btn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(alertSpy.mock.calls[0][0]).toBe("Google Sign-In failed");
    });
  });

  test("signed in but not connected shows fallback Connect UI", async () => {
    // Initial mount refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(false);

    // Focus refresh (safe)
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(false);

    const { findAllByText, findByText } = render(<CalendarScreen />);

    // Header + button label => 2 matches
    const connectTexts = await findAllByText("Connect Google Calendar");
    expect(connectTexts.length).toBeGreaterThanOrEqual(2);

    expect(await findByText("Return to map")).toBeTruthy();
  });

  test("Connect success calls request access + loads events + shows Upcoming Events", async () => {
    // Initial mount refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(false);

    // Focus effect refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(false);

    const { findAllByText, queryByText } = render(<CalendarScreen />);

    // Two matches: header + button label
    const nodes = await findAllByText("Connect Google Calendar");
    fireEvent.press(nodes[1]);

    mockRequestAccess.mockResolvedValueOnce(undefined);

    // After access: refreshState -> now connected
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(true);

    mockFetchUpcoming.mockResolvedValueOnce([
      {
        id: "1",
        summary: "COMP 352",
        location: "Hall Building",
        startISO: "2026-02-27T14:00:00.000Z",
        endISO: "2026-02-27T15:00:00.000Z",
      },
    ]);

    await waitFor(() => {
      expect(mockRequestAccess).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockFetchUpcoming).toHaveBeenCalledTimes(1);
    });

    expect(queryByText("Upcoming Events")).toBeTruthy();
    expect(queryByText(/COMP 352/)).toBeTruthy();
  });

  test("Connect prompt Alert appears only once per focus session", async () => {
    mockGetCurrentUser.mockResolvedValue({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValue(false);

    const { rerender } = render(<CalendarScreen />);
    await flush();

    await waitFor(() => {
      expect(
        alertSpy.mock.calls.some((c) => c[0] === "Connect Google Calendar?"),
      ).toBe(true);
    });

    const count1 = alertSpy.mock.calls.filter(
      (c) => c[0] === "Connect Google Calendar?",
    ).length;

    // Re-render while focused => no repeat
    rerender(<CalendarScreen />);
    await flush();

    const count2 = alertSpy.mock.calls.filter(
      (c) => c[0] === "Connect Google Calendar?",
    ).length;
    expect(count2).toBe(count1);

    // Lose focus then refocus => can show again
    mockIsFocused = false;
    rerender(<CalendarScreen />);
    await flush();

    mockIsFocused = true;
    rerender(<CalendarScreen />);
    await flush();

    const count3 = alertSpy.mock.calls.filter(
      (c) => c[0] === "Connect Google Calendar?",
    ).length;
    expect(count3).toBe(count1 + 1);
  });
});
