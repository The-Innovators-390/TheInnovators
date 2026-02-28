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
const mockFetchUserCalendars = jest.fn();

jest.mock("@/services/googleCalendar", () => ({
  fetchUpcomingCalendarEvents: (...args: any[]) => mockFetchUpcoming(...args),
  fetchUserCalendars: (...args: any[]) => mockFetchUserCalendars(...args),
}));

// Keep derived calculations simple/deterministic for tests
jest.mock("@/hooks/useCalendarDerived", () => ({
  useCalendarDerived: () => ({
    eventDaySet: new Set(),
    monthGrid: [],
    todayKey: "2026-02-27",
    grouped: {},
  }),
}));

// Light-weight mocks for child components
jest.mock("@/components/calendar/MonthCalendarCard", () => {
  return function MonthCalendarCard() {
    return null;
  };
});

jest.mock("@/components/calendar/UpcomingEvents", () => {
  return function UpcomingEvents(props: any) {
    const React = require("react");
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>Upcoming Events</Text>
        {props.events?.map((e: any) => (
          <Text key={e.id}>{e.summary}</Text>
        ))}
      </View>
    );
  };
});

/**
 * Critical: mock OtherCalendars to model the REAL UX:
 * 1) pick a calendar (setPendingCalendarId)
 * 2) apply selection (onSelectCalendar)
 *
 * Also render calendarsError so we can assert loadCalendars catch branch.
 */
jest.mock("@/components/calendar/OtherCalendars", () => {
  return function OtherCalendars(props: any) {
    const React = require("react");
    const { Pressable, Text, View } = require("react-native");

    return (
      <View>
        {!!props.calendarsError && <Text>{props.calendarsError}</Text>}

        <Pressable onPress={() => props.setPendingCalendarId("work")}>
          <Text>TEST_PICK_WORK_CALENDAR</Text>
        </Pressable>

        <Pressable onPress={props.onSelectCalendar}>
          <Text>TEST_APPLY_CALENDAR_SELECTION</Text>
        </Pressable>
      </View>
    );
  };
});

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

  test("Connect success calls request access + loads calendars + loads events + shows Upcoming Events", async () => {
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

    mockFetchUserCalendars.mockResolvedValueOnce([
      { id: "primary", summary: "Primary", primary: true },
      { id: "work", summary: "Work", primary: false },
    ]);

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
      expect(mockFetchUserCalendars).toHaveBeenCalledTimes(1);
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

  test("when signed in + connected, loads calendars and events and shows connected UI", async () => {
    // Initial mount refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(true);

    // Focus cycle refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(true);

    mockFetchUserCalendars.mockResolvedValueOnce([
      { id: "primary", summary: "Primary", primary: true },
      { id: "work", summary: "Work", primary: false },
    ]);

    mockFetchUpcoming.mockResolvedValueOnce([]);

    const { queryByText } = render(<CalendarScreen />);

    await waitFor(() => {
      expect(mockFetchUserCalendars).toHaveBeenCalledTimes(1);
      expect(mockFetchUpcoming).toHaveBeenCalledTimes(1);
    });

    expect(queryByText("Upcoming Events")).toBeTruthy();
  });

  test("selecting another calendar (pick then apply) loads events for that calendar id", async () => {
    // Initial mount refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(true);

    // Focus cycle refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(true);

    mockFetchUserCalendars.mockResolvedValueOnce([
      { id: "primary", summary: "Primary", primary: true },
      { id: "work", summary: "Work", primary: false },
    ]);

    // Initial runFetchCycle loadEvents(primary)
    mockFetchUpcoming.mockResolvedValueOnce([]);
    // After applying selection, loadEvents(work)
    mockFetchUpcoming.mockResolvedValueOnce([]);

    const { findByText } = render(<CalendarScreen />);

    await waitFor(() =>
      expect(mockFetchUserCalendars).toHaveBeenCalledTimes(1),
    );

    fireEvent.press(await findByText("TEST_PICK_WORK_CALENDAR"));

    // allow state update + rerender so onSelectCalendar captures new pendingCalendarId
    await flush();

    fireEvent.press(await findByText("TEST_APPLY_CALENDAR_SELECTION"));

    await waitFor(() => {
      expect(mockFetchUpcoming).toHaveBeenCalledWith("work");
    });
  });

  test("handles calendars load failure (loadCalendars catch)", async () => {
    // Initial mount refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(true);

    // Focus cycle refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(true);

    mockFetchUserCalendars.mockRejectedValueOnce(new Error("cal fail"));

    // Events may still get called in some cycle depending on timing; that's OK.
    mockFetchUpcoming.mockResolvedValueOnce([]);

    const { findByText } = render(<CalendarScreen />);

    expect(await findByText("cal fail")).toBeTruthy();
    expect(mockFetchUserCalendars).toHaveBeenCalled();
  });

  test("handles events load failure (loadEvents catch)", async () => {
    // Initial mount refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(true);

    // Focus cycle refresh
    mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    mockIsConnected.mockResolvedValueOnce(true);

    mockFetchUserCalendars.mockResolvedValueOnce([
      { id: "primary", summary: "Primary", primary: true },
    ]);

    mockFetchUpcoming.mockRejectedValueOnce(new Error("events fail"));

    render(<CalendarScreen />);

    await waitFor(() => {
      expect(mockFetchUpcoming).toHaveBeenCalledTimes(1);
    });
  });
});
