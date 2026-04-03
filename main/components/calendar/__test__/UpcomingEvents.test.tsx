import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import UpcomingEvents from "@/components/calendar/UpcomingEvents";

jest.mock("@/services/calendarUtils", () => ({
  parseISO: jest.fn((iso: string) => {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    return new Date(t);
  }),

  formatDayHeader: jest.fn(() => "Monday March 9th 2026"),
  formatTimeRange: jest.fn(() => "8:45 AM - 9:35 AM"),
}));

const styles = {
  upcomingTitle: {},
  emptyText: {},
  eventsCard: {},
  eventsCardHeader: {},
  eventRow: {},
  eventTextBlock: {},
  eventTime: {},
  purpleLine: {},
  eventTitle: {},
  directionsBtn: {},
  directionsIcon: {},
};

describe("UpcomingEvents", () => {
  it("shows loading indicator when eventsLoading=true", () => {
    const { getByText, UNSAFE_getByType } = render(
      <UpcomingEvents
        eventsLoading={true}
        eventsError={null}
        events={[]}
        grouped={[]}
        styles={styles}
        onPressDirections={jest.fn()}
      />,
    );

    expect(getByText("Upcoming Events")).toBeTruthy();

    const { ActivityIndicator } = require("react-native");
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it("shows error text when eventsError exists", () => {
    const { getByText } = render(
      <UpcomingEvents
        eventsLoading={false}
        eventsError={"events fail"}
        events={[]}
        grouped={[]}
        styles={styles}
        onPressDirections={jest.fn()}
      />,
    );

    expect(getByText("Upcoming Events")).toBeTruthy();
    expect(getByText("events fail")).toBeTruthy();
  });

  it("shows empty state when there are no events", () => {
    const { getByText } = render(
      <UpcomingEvents
        eventsLoading={false}
        eventsError={null}
        events={[]}
        grouped={[]}
        styles={styles}
        onPressDirections={jest.fn()}
      />,
    );

    expect(getByText("Upcoming Events")).toBeTruthy();
    expect(
      getByText("No upcoming events were found in your calendar."),
    ).toBeTruthy();
  });

  it("renders grouped events with formatted header and directions button when location exists", () => {
    const onPressDirections = jest.fn();

    const events = [
      {
        id: "1",
        // summary should NOT already include location, because component appends it
        summary: "SOEN 363 TUT - Sir George Williams Campus",
        location: "Hall Building Rm 607",
        startISO: "2026-03-09T08:45:00.000Z",
        endISO: "2026-03-09T09:35:00.000Z",
      },
    ] as any[];

    const grouped = [{ key: "2026-03-09", items: events }] as any[];

    const { getByText } = render(
      <UpcomingEvents
        eventsLoading={false}
        eventsError={null}
        events={events as any}
        grouped={grouped as any}
        styles={styles}
        onPressDirections={onPressDirections}
      />,
    );

    expect(getByText("Monday March 9th 2026")).toBeTruthy();
    expect(getByText("8:45 AM - 9:35 AM")).toBeTruthy();

    expect(
      getByText(
        "SOEN 363 TUT - Sir George Williams Campus - Hall Building Rm 607",
      ),
    ).toBeTruthy();

    fireEvent.press(getByText("Get Directions"));
    expect(onPressDirections).toHaveBeenCalledTimes(1);
    expect(onPressDirections).toHaveBeenCalledWith(events[0]);
  });

  it('uses "Upcoming" header when parseISO returns null and hides directions when location is blank', () => {
    const onPressDirections = jest.fn();

    const events = [
      {
        id: "1",
        summary: null, // -> "Untitled"
        location: "   ", // whitespace -> hasLocation false, but still truthy so title becomes "Untitled -    "
        startISO: "not-a-timestamp",
        endISO: "not-a-timestamp",
      },
    ] as any[];

    const grouped = [{ key: "invalid", items: events }] as any[];

    const { getByText, queryByText } = render(
      <UpcomingEvents
        eventsLoading={false}
        eventsError={null}
        events={events as any}
        grouped={grouped as any}
        styles={styles}
        onPressDirections={onPressDirections}
      />,
    );

    expect(getByText("Upcoming Events")).toBeTruthy();
    expect(getByText("Upcoming")).toBeTruthy();

    expect(getByText(/Untitled/)).toBeTruthy();

    expect(queryByText("Get Directions")).toBeNull();
    expect(onPressDirections).not.toHaveBeenCalled();
  });
});
