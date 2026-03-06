import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import MonthCalendarCard from "@/components/calendar/MonthCalendarCard";

// IMPORTANT: variables referenced inside jest.mock factory must start with "mock"
const mockMonthTitle = jest.fn((_d: Date) => "March 2026");
const mockDateKeyFromDate = jest.fn((d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
});

jest.mock("@/services/calendarUtils", () => ({
  monthTitle: (d: Date) => mockMonthTitle(d),
  dateKeyFromDate: (d: Date) => mockDateKeyFromDate(d),
}));

const styles = {
  calendarCard: {},
  calendarCardTop: {},
  calendarName: {},
  collapseIcon: {},

  monthHeaderRow: {},
  monthNavBtn: {},
  monthNavText: {},
  monthTitle: {},

  weekHeaderRow: {},
  weekHeaderText: {},

  daysGrid: {},
  dayBlank: {},
  dayCellWrap: {},
  dayPill: {},
  dayPillToday: {},
  dayCellText: {},
  dayTextToday: {},
  eventDot: {},
  eventDotSpacer: {},
};

type MonthCell = { type: "blank" } | { type: "day"; date: Date };

describe("MonthCalendarCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders month title and weekday header", () => {
    const monthCursor = new Date(2026, 2, 1);
    const setMonthCursor = jest.fn();

    const monthGrid: MonthCell[] = [
      { type: "blank" },
      { type: "day", date: new Date(2026, 2, 1) },
    ];

    const { getByText } = render(
      <MonthCalendarCard
        monthCursor={monthCursor}
        setMonthCursor={setMonthCursor as any}
        monthGrid={monthGrid}
        todayKey={"2026-03-09"}
        eventDaySet={new Set()}
        styles={styles}
      />,
    );

    expect(mockMonthTitle).toHaveBeenCalledWith(monthCursor);
    expect(getByText("March 2026")).toBeTruthy();

    expect(getByText("Su")).toBeTruthy();
    expect(getByText("Mo")).toBeTruthy();
    expect(getByText("Tu")).toBeTruthy();
    expect(getByText("We")).toBeTruthy();
    expect(getByText("Th")).toBeTruthy();
    expect(getByText("Fr")).toBeTruthy();
    expect(getByText("Sa")).toBeTruthy();
  });

  it("prev/next buttons call setMonthCursor updater and compute correct month", () => {
    const monthCursor = new Date(2026, 2, 1);
    const setMonthCursor = jest.fn();

    const monthGrid: MonthCell[] = [
      { type: "day", date: new Date(2026, 2, 1) },
    ];

    const { getByText } = render(
      <MonthCalendarCard
        monthCursor={monthCursor}
        setMonthCursor={setMonthCursor as any}
        monthGrid={monthGrid}
        todayKey={"2026-03-09"}
        eventDaySet={new Set()}
        styles={styles}
      />,
    );

    fireEvent.press(getByText("‹"));
    expect(setMonthCursor).toHaveBeenCalledTimes(1);
    const prevUpdater = setMonthCursor.mock.calls[0][0];
    const prev = prevUpdater(new Date(2026, 2, 15));
    expect(prev.getFullYear()).toBe(2026);
    expect(prev.getMonth()).toBe(1);
    expect(prev.getDate()).toBe(1);

    fireEvent.press(getByText("›"));
    expect(setMonthCursor).toHaveBeenCalledTimes(2);
    const nextUpdater = setMonthCursor.mock.calls[1][0];
    const next = nextUpdater(new Date(2026, 2, 15));
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(3);
    expect(next.getDate()).toBe(1);
  });

  it("calls dateKeyFromDate for each day cell (not blanks) and renders day numbers", () => {
    const monthCursor = new Date(2026, 2, 1);
    const setMonthCursor = jest.fn();

    const d1 = new Date(2026, 2, 9);
    const d2 = new Date(2026, 2, 10);

    const monthGrid: MonthCell[] = [
      { type: "blank" },
      { type: "day", date: d1 },
      { type: "day", date: d2 },
    ];

    const { getByText } = render(
      <MonthCalendarCard
        monthCursor={monthCursor}
        setMonthCursor={setMonthCursor as any}
        monthGrid={monthGrid}
        todayKey={"2026-03-09"}
        eventDaySet={new Set(["2026-03-10"])}
        styles={styles}
      />,
    );

    expect(getByText("9")).toBeTruthy();
    expect(getByText("10")).toBeTruthy();

    expect(mockDateKeyFromDate).toHaveBeenCalledWith(d1);
    expect(mockDateKeyFromDate).toHaveBeenCalledWith(d2);
  });
});
