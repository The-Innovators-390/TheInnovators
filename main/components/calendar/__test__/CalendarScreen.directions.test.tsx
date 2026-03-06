import React from "react";
import { Alert } from "react-native";
import { render, fireEvent, waitFor } from "@testing-library/react-native";

import CalendarScreen from "@/app/(tabs)/calendar";
import { router } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { isGoogleCalendarConnected } from "@/hooks/useGoogleAuth";
import {
  fetchUpcomingCalendarEvents,
  fetchUserCalendars,
} from "@/services/googleCalendar";
import { parseLocationDetails } from "@/services/calendarUtils";

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    getCurrentUser: jest.fn(),
  },
}));

jest.mock("@/hooks/useGoogleAuth", () => ({
  configureGoogleSignIn: jest.fn(),
  signInWithGoogle: jest.fn(),
  requestGoogleCalendarAccess: jest.fn(),
  isGoogleCalendarConnected: jest.fn(),
}));

jest.mock("@/services/googleCalendar", () => ({
  fetchUpcomingCalendarEvents: jest.fn(),
  fetchUserCalendars: jest.fn(),
}));

jest.mock("@/services/calendarUtils", () => ({
  parseLocationDetails: jest.fn(),
}));

jest.mock("@/hooks/useCalendarDerived", () => ({
  useCalendarDerived: () => ({
    eventDaySet: new Set(),
    monthGrid: [],
    todayKey: "2026-03-05",
    grouped: [],
  }),
}));

jest.mock("@/components/calendar/MonthCalendarCard", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return function MockMonthCalendarCard() {
    return <Text>MonthCalendarCard</Text>;
  };
});

jest.mock("@/components/calendar/UpcomingEvents", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return function MockUpcomingEvents() {
    return <Text>UpcomingEvents</Text>;
  };
});

jest.mock("@/components/calendar/OtherCalendars", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return function MockOtherCalendars() {
    return <Text>OtherCalendars</Text>;
  };
});

jest.mock("@/components/calendar/FindNextClass", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return function MockFindNextClass({ onPressDirections }: any) {
    return (
      <View>
        <Pressable
          testID="press-no-location"
          onPress={() => onPressDirections({ location: "" })}
        >
          <Text>No location</Text>
        </Pressable>

        <Pressable
          testID="press-unknown-location"
          onPress={() => onPressDirections({ location: "Some random place" })}
        >
          <Text>Unknown location</Text>
        </Pressable>

        <Pressable
          testID="press-valid-location"
          onPress={() => onPressDirections({ location: "Hall Building" })}
        >
          <Text>Valid location</Text>
        </Pressable>
      </View>
    );
  };
});

describe("CalendarScreen directions handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    (GoogleSignin.getCurrentUser as jest.Mock).mockResolvedValue({
      user: { email: "test@concordia.ca" },
    });

    (isGoogleCalendarConnected as jest.Mock).mockResolvedValue(true);

    (fetchUserCalendars as jest.Mock).mockResolvedValue([
      { id: "primary", summary: "Primary", primary: true },
    ]);

    (fetchUpcomingCalendarEvents as jest.Mock).mockResolvedValue([]);
  });

  it("shows alert when event has no location", async () => {
    const { getByTestId, getByText } = render(<CalendarScreen />);

    await waitFor(() => {
      expect(getByText("MonthCalendarCard")).toBeTruthy();
    });

    fireEvent.press(getByTestId("press-no-location"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "No Location",
      "This event has no location information.",
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows alert when location does not match a Concordia building", async () => {
    (parseLocationDetails as jest.Mock).mockReturnValue({
      building: null,
    });

    const { getByTestId, getByText } = render(<CalendarScreen />);

    await waitFor(() => {
      expect(getByText("MonthCalendarCard")).toBeTruthy();
    });

    fireEvent.press(getByTestId("press-unknown-location"));

    expect(parseLocationDetails).toHaveBeenCalledWith("Some random place");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Location not found",
      `We couldn't find a Concordia building for: "Some random place".`,
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("navigates to the map when a Concordia building is found", async () => {
    (parseLocationDetails as jest.Mock).mockReturnValue({
      building: { id: "h" },
    });

    const { getByTestId, getByText } = render(<CalendarScreen />);

    await waitFor(() => {
      expect(getByText("MonthCalendarCard")).toBeTruthy();
    });

    fireEvent.press(getByTestId("press-valid-location"));

    expect(parseLocationDetails).toHaveBeenCalledWith("Hall Building");
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/(tabs)/map",
      params: { destBuildingId: "h" },
    });
  });
});
