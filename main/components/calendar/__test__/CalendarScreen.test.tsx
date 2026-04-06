import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import CalendarScreen from "@/app/(tabs)/calendar";
import { googleCalendarFacade } from "@/services/google/facades/GoogleCalendarFacade";
import { configureGoogleSignIn, signInWithGoogle } from "@/hooks/useGoogleAuth";
import { parseLocationDetails } from "@/services/calendarUtils";
import { findRoomNode } from "@/services/indoorNavigationMapping";
import { getDeviceLocation } from "@/components/campus/helper_methods/locationUtils";
import { getBuildingContainingPoint } from "@/components/campus/helper_methods/campusMap.buildings";
import { router } from "expo-router";

let mockIsFocused = true;

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => mockIsFocused,
}));

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock("@/hooks/useGoogleAuth", () => ({
  configureGoogleSignIn: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

jest.mock("@/services/google/facades/GoogleCalendarFacade", () => ({
  googleCalendarFacade: {
    getConnectionState: jest.fn(),
    connectCalendar: jest.fn(),
    loadScreenData: jest.fn(),
    reloadEventsForCalendar: jest.fn(),
  },
}));

jest.mock("@/services/calendarUtils", () => ({
  parseLocationDetails: jest.fn(),
}));

jest.mock("@/services/indoorNavigationMapping", () => ({
  findRoomNode: jest.fn(),
}));

jest.mock("@/components/campus/helper_methods/locationUtils", () => ({
  getDeviceLocation: jest.fn(),
}));

jest.mock("@/components/campus/helper_methods/campusMap.buildings", () => ({
  getBuildingContainingPoint: jest.fn(),
}));

jest.mock("@/components/Buildings/SGW/SGWBuildings", () => ({
  SGW_BUILDINGS: [{ id: "h", code: "H" }],
}));

jest.mock("@/components/Buildings/Loyola/LoyolaBuildings", () => ({
  LOYOLA_BUILDINGS: [{ id: "vl", code: "VL" }],
}));

jest.mock("@/components/indoors/indoorData", () => ({
  indoorData: {
    H: { floors: [] },
  },
}));

jest.mock("@/hooks/useCalendarDerived", () => ({
  useCalendarDerived: () => ({
    eventDaySet: new Set(),
    monthGrid: [],
    todayKey: "2026-02-27",
    grouped: [],
  }),
}));

jest.mock("@/components/calendar/MonthCalendarCard", () => {
  return function MonthCalendarCard() {
    const { Text } = require("react-native");
    return <Text>TEST_MONTH_CALENDAR_CARD_STUB</Text>;
  };
});

jest.mock("@/components/calendar/FindNextClass", () => {
  return function FindNextClass(props: any) {
    const { View, Text, Pressable } = require("react-native");

    return (
      <View>
        <Text>TEST_FIND_NEXT_CLASS_STUB</Text>

        <Pressable
          testID="next-class-no-location"
          onPress={() =>
            props.onPressDirections({
              id: "evt-no-location",
              summary: "No location event",
              location: "",
              startISO: "2026-02-27T14:00:00.000Z",
              endISO: "2026-02-27T15:00:00.000Z",
            })
          }
        >
          <Text>TRIGGER_NO_LOCATION</Text>
        </Pressable>

        <Pressable
          testID="next-class-valid-location"
          onPress={() =>
            props.onPressDirections({
              id: "evt-valid-location",
              summary: "Valid event",
              location: "Hall Building H-920",
              startISO: "2026-02-27T16:00:00.000Z",
              endISO: "2026-02-27T17:00:00.000Z",
            })
          }
        >
          <Text>TRIGGER_VALID_LOCATION</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock("@/components/calendar/UpcomingEvents", () => {
  return function UpcomingEvents(props: any) {
    const { View, Text, Pressable } = require("react-native");

    return (
      <View>
        <Text>TEST_UPCOMING_EVENTS_STUB</Text>
        {!!props.eventsError && <Text>{props.eventsError}</Text>}

        <Pressable
          testID="upcoming-unknown-location"
          onPress={() =>
            props.onPressDirections({
              id: "evt-unknown-building",
              summary: "Unknown building event",
              location: "Unknown Place",
              startISO: "2026-02-27T18:00:00.000Z",
              endISO: "2026-02-27T19:00:00.000Z",
            })
          }
        >
          <Text>TRIGGER_UNKNOWN_BUILDING</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock("@/components/calendar/OtherCalendars", () => {
  return function OtherCalendars(props: any) {
    const { View, Text, Pressable } = require("react-native");

    return (
      <View>
        <Text>TEST_OTHER_CALENDARS_STUB</Text>
        {!!props.calendarsError && <Text>{props.calendarsError}</Text>}

        <Pressable
          testID="set-work-calendar"
          onPress={() => props.setPendingCalendarId("work")}
        >
          <Text>SET_WORK_CALENDAR</Text>
        </Pressable>

        <Pressable testID="select-calendar" onPress={props.onSelectCalendar}>
          <Text>SELECT_CALENDAR</Text>
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
  const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

  const mockConfigureGoogleSignIn = configureGoogleSignIn as jest.Mock;
  const mockSignInWithGoogle = signInWithGoogle as jest.Mock;

  const mockGetConnectionState =
    googleCalendarFacade.getConnectionState as jest.Mock;
  const mockConnectCalendar = googleCalendarFacade.connectCalendar as jest.Mock;
  const mockLoadScreenData = googleCalendarFacade.loadScreenData as jest.Mock;
  const mockReloadEventsForCalendar =
    googleCalendarFacade.reloadEventsForCalendar as jest.Mock;

  const mockParseLocationDetails = parseLocationDetails as jest.Mock;
  const mockFindRoomNode = findRoomNode as jest.Mock;
  const mockGetDeviceLocation = getDeviceLocation as jest.Mock;
  const mockGetBuildingContainingPoint =
    getBuildingContainingPoint as jest.Mock;

  const replaceMock = router.replace as jest.Mock;
  const pushMock = router.push as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused = true;
    alertSpy.mockClear();

    mockConfigureGoogleSignIn.mockImplementation(() => {});
    mockParseLocationDetails.mockReturnValue({ building: null, room: null });
    mockFindRoomNode.mockReturnValue(null);
    mockGetDeviceLocation.mockResolvedValue(null);
    mockGetBuildingContainingPoint.mockReturnValue(null);
  });

  test("renders not signed in UI", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: false,
      calendarConnected: false,
    });

    const { findByText } = render(<CalendarScreen />);

    expect(await findByText("Not logged in!")).toBeTruthy();
    expect(await findByText("Sign in with Google")).toBeTruthy();
    expect(await findByText("Return to map")).toBeTruthy();
  });

  test("sign in button calls signInWithGoogle then refreshes state", async () => {
    mockGetConnectionState
      .mockResolvedValueOnce({
        signedIn: false,
        calendarConnected: false,
      })
      .mockResolvedValueOnce({
        signedIn: true,
        calendarConnected: false,
      });

    mockSignInWithGoogle.mockResolvedValueOnce(undefined);

    const { findByText } = render(<CalendarScreen />);
    fireEvent.press(await findByText("Sign in with Google"));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockGetConnectionState).toHaveBeenCalledTimes(2);
    });
  });

  test("sign in error shows explicit alert message", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: false,
      calendarConnected: false,
    });

    mockSignInWithGoogle.mockRejectedValueOnce(new Error("boom"));

    const { findByText } = render(<CalendarScreen />);
    fireEvent.press(await findByText("Sign in with Google"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Google Sign-In failed", "boom");
    });
  });

  test("sign in error shows fallback message when error has no message", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: false,
      calendarConnected: false,
    });

    mockSignInWithGoogle.mockRejectedValueOnce({});

    const { findByText } = render(<CalendarScreen />);
    fireEvent.press(await findByText("Sign in with Google"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Google Sign-In failed",
        "Sign-in was cancelled or failed.",
      );
    });
  });

  test("return to map button replaces route", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: false,
      calendarConnected: false,
    });

    const { findByText } = render(<CalendarScreen />);
    fireEvent.press(await findByText("Return to map"));

    expect(replaceMock).toHaveBeenCalledWith("/(tabs)/map");
  });

  test("signed in but not connected shows fallback connect UI", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: false,
    });

    const { findAllByText, findByText } = render(<CalendarScreen />);

    const connectTexts = await findAllByText("Connect Google Calendar");
    expect(connectTexts.length).toBeGreaterThanOrEqual(2);
    expect(await findByText("Return to map")).toBeTruthy();
  });

  test("connect success calls facade connect and loads screen data", async () => {
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

  test("connect failure shows fallback alert and returns to map", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: false,
    });

    mockConnectCalendar.mockRejectedValueOnce({});

    const { findAllByText } = render(<CalendarScreen />);
    const nodes = await findAllByText("Connect Google Calendar");

    fireEvent.press(nodes[1]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Calendar not connected",
        "You can connect it later.",
      );
    });

    expect(replaceMock).toHaveBeenCalledWith("/(tabs)/map");
  });

  test("connect prompt alert appears only once per focus session", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: false,
    });

    const { rerender } = render(<CalendarScreen />);
    await flush();

    await waitFor(() => {
      expect(
        alertSpy.mock.calls.some(
          (call) => call[0] === "Connect Google Calendar?",
        ),
      ).toBe(true);
    });

    const count1 = alertSpy.mock.calls.filter(
      (call) => call[0] === "Connect Google Calendar?",
    ).length;

    rerender(<CalendarScreen />);
    await flush();

    const count2 = alertSpy.mock.calls.filter(
      (call) => call[0] === "Connect Google Calendar?",
    ).length;

    expect(count2).toBe(count1);

    mockIsFocused = false;
    rerender(<CalendarScreen />);
    await flush();

    mockIsFocused = true;
    rerender(<CalendarScreen />);
    await flush();

    const count3 = alertSpy.mock.calls.filter(
      (call) => call[0] === "Connect Google Calendar?",
    ).length;

    expect(count3).toBe(count1 + 1);
  });

  test("when signed in and connected, loads screen data", async () => {
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

  test("handles loadScreenData failure with explicit message", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: true,
    });

    mockLoadScreenData.mockRejectedValueOnce(new Error("cal fail"));

    const { findAllByText } = render(<CalendarScreen />);

    const matches = await findAllByText("cal fail");
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test("handles loadScreenData failure with fallback messages", async () => {
    mockGetConnectionState.mockResolvedValue({
      signedIn: true,
      calendarConnected: true,
    });

    mockLoadScreenData.mockRejectedValueOnce({});

    const { findByText } = render(<CalendarScreen />);

    expect(await findByText("Could not load calendar events.")).toBeTruthy();
    expect(await findByText("Could not load calendars.")).toBeTruthy();
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

    const { findByTestId } = render(<CalendarScreen />);

    fireEvent.press(await findByTestId("set-work-calendar"));
    fireEvent.press(await findByTestId("select-calendar"));

    await waitFor(() => {
      expect(mockReloadEventsForCalendar).toHaveBeenCalledWith("work");
    });
  });

  test("selecting another calendar handles reload error with fallback", async () => {
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

    mockReloadEventsForCalendar.mockRejectedValueOnce({});

    const { findByTestId, findByText } = render(<CalendarScreen />);

    fireEvent.press(await findByTestId("set-work-calendar"));
    fireEvent.press(await findByTestId("select-calendar"));

    expect(await findByText("Could not load calendar events.")).toBeTruthy();
  });

  test("directions shows no-location alert when event location is missing", async () => {
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

    const { findByTestId } = render(<CalendarScreen />);

    fireEvent.press(await findByTestId("next-class-no-location"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "No Location",
        "This event has no location information.",
      );
    });
  });

  test("directions shows building-not-found alert when parsed building is missing", async () => {
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

    mockParseLocationDetails.mockReturnValue({
      building: null,
      room: null,
    });

    const { findByTestId } = render(<CalendarScreen />);

    fireEvent.press(await findByTestId("upcoming-unknown-location"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Location not found",
        `We couldn't find a Concordia building for: "Unknown Place".`,
      );
    });
  });

  test("directions pushes map route with room and indoor start params when available", async () => {
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

    mockParseLocationDetails.mockReturnValue({
      building: { id: "h", code: "H" },
      room: "920",
    });

    mockFindRoomNode.mockReturnValue({
      id: "room-920",
      label: "H-920",
    });

    mockGetDeviceLocation.mockResolvedValue({
      latitude: 45.497,
      longitude: -73.579,
    });

    mockGetBuildingContainingPoint.mockReturnValue({
      id: "h",
      code: "H",
    });

    const { findByTestId } = render(<CalendarScreen />);

    fireEvent.press(await findByTestId("next-class-valid-location"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({
        pathname: "/(tabs)/map",
        params: {
          destBuildingId: "h",
          externalDestRoomNodeId: "room-920",
          externalDestRoomLabel: "H-920",
          externalDestBuildingCode: "H",
          indoorStartBuildingCode: "H",
          indoorStartBuildingId: "h",
          indoorStartLabel: "Your current room",
        },
      });
    });
  });

  test("directions still pushes map route when device location fails", async () => {
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

    mockParseLocationDetails.mockReturnValue({
      building: { id: "h", code: "H" },
      room: "920",
    });

    mockFindRoomNode.mockReturnValue({
      id: "room-920",
      label: "H-920",
    });

    mockGetDeviceLocation.mockRejectedValueOnce(new Error("gps off"));

    const { findByTestId } = render(<CalendarScreen />);

    fireEvent.press(await findByTestId("next-class-valid-location"));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith({
        pathname: "/(tabs)/map",
        params: {
          destBuildingId: "h",
          externalDestRoomNodeId: "room-920",
          externalDestRoomLabel: "H-920",
          externalDestBuildingCode: "H",
        },
      });
    });
  });

  test("configureGoogleSignIn errors are ignored on mount", async () => {
    mockConfigureGoogleSignIn.mockImplementation(() => {
      throw new Error("already configured");
    });

    mockGetConnectionState.mockResolvedValue({
      signedIn: false,
      calendarConnected: false,
    });

    const { findByText } = render(<CalendarScreen />);

    expect(await findByText("Not logged in!")).toBeTruthy();
    expect(mockConfigureGoogleSignIn).toHaveBeenCalled();
  });
});
