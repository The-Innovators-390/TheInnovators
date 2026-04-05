import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import CalendarScreen from "@/app/(tabs)/calendar";
import { googleCalendarFacade } from "@/services/google/facades/GoogleCalendarFacade";

let mockIsFocused = true;

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

const mockConfigure = jest.fn();
const mockSignIn = jest.fn();

jest.mock("@/hooks/useGoogleAuth", () => ({
  configureGoogleSignIn: (...args: any[]) => mockConfigure(...args),
  signInWithGoogle: (...args: any[]) => mockSignIn(...args),
}));

jest.mock("@/services/google/facades/GoogleCalendarFacade", () => ({
  googleCalendarFacade: {
    getConnectionState: jest.fn(),
    connectCalendar: jest.fn(),
    loadScreenData: jest.fn(),
    reloadEventsForCalendar: jest.fn(),
  },
}));

// Keep derived calculations simple/deterministic for CalendarScreen tests
jest.mock("@/hooks/useCalendarDerived", () => ({
  useCalendarDerived: () => ({
    eventDaySet: new Set(),
    monthGrid: [],
    todayKey: "2026-02-27",
    grouped: [],
  }),
}));

// Child components are tested elsewhere -> stub them here
jest.mock("@/components/calendar/MonthCalendarCard", () => {
  return function MonthCalendarCard() {
    const { Text } = require("react-native");
    return <Text>TEST_MONTH_CALENDAR_CARD_STUB</Text>;
  };
});

jest.mock("@/components/calendar/UpcomingEvents", () => {
  return function UpcomingEvents(props: any) {
    const { Text, View } = require("react-native");

    return (
      <View>
        <Text>TEST_UPCOMING_EVENTS_STUB</Text>
        {!!props.eventsError && <Text>{props.eventsError}</Text>}
      </View>
    );
  };
});

jest.mock("@/components/calendar/OtherCalendars", () => {
  return function OtherCalendars(props: any) {
    const { Text, View } = require("react-native");

    return (
      <View>
        <Text>TEST_OTHER_CALENDARS_STUB</Text>
        {!!props.calendarsError && <Text>{props.calendarsError}</Text>}
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
  const mockGetConnectionState =
    googleCalendarFacade.getConnectionState as jest.Mock;
  const mockConnectCalendar = googleCalendarFacade.connectCalendar as jest.Mock;
  const mockLoadScreenData = googleCalendarFacade.loadScreenData as jest.Mock;
  const mockReloadEventsForCalendar =
    googleCalendarFacade.reloadEventsForCalendar as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
  });

  test("renders Not logged in UI when user is not signed in", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: false,
      calendarConnected: false,
    });

    const { findByText } = render(<CalendarScreen />);

    expect(await findByText("Not logged in!")).toBeTruthy();
    expect(await findByText("Sign in with Google")).toBeTruthy();
    expect(await findByText("Return to map")).toBeTruthy();
  });

  test("Sign in button calls signInWithGoogle then refreshes state", async () => {
    mockGetConnectionState
      .mockResolvedValueOnce({
        signedIn: false,
        calendarConnected: false,
      })
      .mockResolvedValueOnce({
        signedIn: true,
        calendarConnected: false,
      });

    const { findByText } = render(<CalendarScreen />);
    const btn = await findByText("Sign in with Google");

    mockSignIn.mockResolvedValueOnce(undefined);

    fireEvent.press(btn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockGetConnectionState).toHaveBeenCalled();
    });
  });

  test("Sign in error shows alert", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: false,
      calendarConnected: false,
    });

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
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: false,
    });

    const { findAllByText, findByText } = render(<CalendarScreen />);

    const connectTexts = await findAllByText("Connect Google Calendar");
    expect(connectTexts.length).toBeGreaterThanOrEqual(2);

    expect(await findByText("Return to map")).toBeTruthy();
  });

  test("Connect success calls facade connect + loads screen data", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: false,
    });

    mockConnectCalendar.mockResolvedValueOnce({
      signedIn: true,
      calendarConnected: true,
    });

    mockLoadScreenData.mockResolvedValueOnce({
      auth: {
        signedIn: true,
        calendarConnected: true,
      },
      calendars: [
        { id: "primary", summary: "Primary", primary: true },
        { id: "work", summary: "Work", primary: false },
      ],
      events: [
        {
          id: "1",
          summary: "COMP 352",
          location: "Hall Building",
          startISO: "2026-02-27T14:00:00.000Z",
          endISO: "2026-02-27T15:00:00.000Z",
        },
      ],
      activeCalendarId: "primary",
    });

    const { findAllByText } = render(<CalendarScreen />);

    const nodes = await findAllByText("Connect Google Calendar");
    fireEvent.press(nodes[1]);

    await waitFor(() => {
      expect(mockConnectCalendar).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockLoadScreenData).toHaveBeenCalledTimes(1);
    });
  });

  test("Connect prompt Alert appears only once per focus session", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: false,
    });

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

    rerender(<CalendarScreen />);
    await flush();

    const count2 = alertSpy.mock.calls.filter(
      (c) => c[0] === "Connect Google Calendar?",
    ).length;
    expect(count2).toBe(count1);

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

  test("when signed in + connected, loads screen data", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: true,
    });

    mockLoadScreenData.mockResolvedValueOnce({
      auth: {
        signedIn: true,
        calendarConnected: true,
      },
      calendars: [{ id: "primary", summary: "Primary", primary: true }],
      events: [],
      activeCalendarId: "primary",
    });

    render(<CalendarScreen />);

    await waitFor(() => {
      expect(mockLoadScreenData).toHaveBeenCalledTimes(1);
    });
  });

  test("handles calendars load failure (loadScreenData catch)", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: true,
    });

    mockLoadScreenData.mockRejectedValueOnce(new Error("cal fail"));

    const { findByText } = render(<CalendarScreen />);

    expect(await findByText("cal fail")).toBeTruthy();
    expect(mockLoadScreenData).toHaveBeenCalled();
  });

  test("handles events load failure (loadScreenData catch)", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: true,
    });

    mockLoadScreenData.mockRejectedValueOnce(new Error("events fail"));

    const { findByText } = render(<CalendarScreen />);

    expect(await findByText("events fail")).toBeTruthy();
    expect(mockLoadScreenData).toHaveBeenCalledTimes(1);
  });

  test("selecting another calendar reloads events through facade", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: true,
    });

    mockLoadScreenData.mockResolvedValueOnce({
      auth: {
        signedIn: true,
        calendarConnected: true,
      },
      calendars: [
        { id: "primary", summary: "Primary", primary: true },
        { id: "work", summary: "Work", primary: false },
      ],
      events: [],
      activeCalendarId: "primary",
    });

    mockReloadEventsForCalendar.mockResolvedValueOnce([
      {
        id: "2",
        summary: "SOEN 390",
        location: "EV Building",
        startISO: "2026-02-27T16:00:00.000Z",
        endISO: "2026-02-27T17:00:00.000Z",
      },
    ]);

    render(<CalendarScreen />);

    await waitFor(() => {
      expect(mockLoadScreenData).toHaveBeenCalledTimes(1);
    });
  });
});
