import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import FindNextClass from "@/components/calendar/FindNextClass";
import {
  fetchNextClassEvent,
  fetchNextClassEventToday,
  NextClassError,
} from "@/services/googleCalendar";

jest.mock("@/services/googleCalendar", () => ({
  fetchNextClassEvent: jest.fn(),
  fetchNextClassEventToday: jest.fn(),
  NextClassError: class extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message);
      this.code = code;
    }
  },
}));

jest.mock("@/components/Buildings/search", () => ({
  searchSGWBuildings: jest.fn(() => [
    { code: "H", name: "Hall Building", campus: "SGW" },
  ]),
  searchLoyolaBuildings: jest.fn(() => [
    { code: "LB", name: "Loyola Building", campus: "LOY" },
  ]),
}));

jest.mock("@/components/calendar/calendarStyles", () => ({
  styles: {
    directionsBtn: {},
    directionsIcon: {},
  },
}));

describe("FindNextClass", () => {
  const mockDirections = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders Find My Next Class button", () => {
    const { getByText } = render(
      <FindNextClass calendarId="primary" onPressDirections={mockDirections} />,
    );

    expect(getByText("Find my Next Class")).toBeTruthy();
  });

  test("shows message if no calendar selected", async () => {
    const { getByText, findByText } = render(
      <FindNextClass onPressDirections={mockDirections} />,
    );

    fireEvent.press(getByText("Find my Next Class"));

    expect(
      await findByText("Please select your class calendar first."),
    ).toBeTruthy();
  });

  test("shows today's next class if available", async () => {
    (fetchNextClassEventToday as jest.Mock).mockResolvedValueOnce({
      id: "1",
      summary: "COMP 352",
      location: "SGW Campus - Hall Building Rm H-110",
      startISO: "2026-03-01T14:00:00.000Z",
    });

    const { getByText, findByText } = render(
      <FindNextClass calendarId="primary" onPressDirections={mockDirections} />,
    );

    fireEvent.press(getByText("Find my Next Class"));

    expect(await findByText("COMP 352")).toBeTruthy();
    expect(await findByText(/Building:/)).toBeTruthy();
    expect(await findByText(/Room:/)).toBeTruthy();
  });

  test("shows next upcoming class if none left today", async () => {
    (fetchNextClassEventToday as jest.Mock).mockResolvedValueOnce(null);

    (fetchNextClassEvent as jest.Mock).mockResolvedValueOnce({
      id: "2",
      summary: "SOEN 341",
      location: "SGW Campus - Hall Building Rm H-920",
      startISO: "2026-03-02T15:00:00.000Z",
    });

    const { getByText, findByText } = render(
      <FindNextClass calendarId="primary" onPressDirections={mockDirections} />,
    );

    fireEvent.press(getByText("Find my Next Class"));

    expect(await findByText("SOEN 341")).toBeTruthy();
    expect(
      await findByText("No more classes scheduled for today. Next class:"),
    ).toBeTruthy();
  });

  test("shows no upcoming classes message", async () => {
    (fetchNextClassEventToday as jest.Mock).mockResolvedValueOnce(null);
    (fetchNextClassEvent as jest.Mock).mockResolvedValueOnce(null);

    const { getByText, findByText } = render(
      <FindNextClass calendarId="primary" onPressDirections={mockDirections} />,
    );

    fireEvent.press(getByText("Find my Next Class"));

    expect(await findByText("No upcoming classes found.")).toBeTruthy();
  });

  test("handles NOT_CONNECTED error", async () => {
    (fetchNextClassEventToday as jest.Mock).mockRejectedValueOnce(
      new NextClassError("NOT_CONNECTED"),
    );

    const { getByText, findByText } = render(
      <FindNextClass calendarId="primary" onPressDirections={mockDirections} />,
    );

    fireEvent.press(getByText("Find my Next Class"));

    expect(
      await findByText(
        "Google Calendar isn’t connected. Please connect it and try again.",
      ),
    ).toBeTruthy();
  });

  test("handles WRONG_CALENDAR error", async () => {
    (fetchNextClassEventToday as jest.Mock).mockRejectedValueOnce(
      new NextClassError("WRONG_CALENDAR"),
    );

    const { getByText, findByText } = render(
      <FindNextClass calendarId="primary" onPressDirections={mockDirections} />,
    );

    fireEvent.press(getByText("Find my Next Class"));

    expect(
      await findByText(
        "Selected calendar cannot be accessed. Please choose the correct calendar.",
      ),
    ).toBeTruthy();
  });

  test("handles API_ERROR", async () => {
    (fetchNextClassEventToday as jest.Mock).mockRejectedValueOnce(
      new NextClassError("API_ERROR", "API failed"),
    );

    const { getByText, findByText } = render(
      <FindNextClass calendarId="primary" onPressDirections={mockDirections} />,
    );

    fireEvent.press(getByText("Find my Next Class"));

    expect(await findByText("API failed")).toBeTruthy();
  });

  test("pressing directions button calls handler", async () => {
    (fetchNextClassEventToday as jest.Mock).mockResolvedValueOnce({
      id: "1",
      summary: "COMP 352",
      location: "SGW Campus - Hall Building Rm H-110",
      startISO: "2026-03-01T14:00:00.000Z",
    });

    const { getByText, findByText } = render(
      <FindNextClass calendarId="primary" onPressDirections={mockDirections} />,
    );

    fireEvent.press(getByText("Find my Next Class"));

    const classTitle = await findByText("COMP 352");
    expect(classTitle).toBeTruthy();
  });
});
