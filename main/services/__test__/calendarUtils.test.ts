jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    getCurrentUser: jest.fn(),
  },
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

jest.mock("@/hooks/useGoogleAuth", () => ({
  configureGoogleSignIn: jest.fn(),
  signInWithGoogle: jest.fn(),
  requestGoogleCalendarAccess: jest.fn(),
  isGoogleCalendarConnected: jest.fn(),
}));

jest.mock("@/services/googleCalendar", () => ({
  fetchUpcomingCalendarEvents: jest.fn(),
}));

import {
  pad2,
  parseISO,
  dateKeyFromDate,
  dateKey,
  formatDayHeader,
  formatTimeRange,
  startOfMonth,
  daysInMonth,
  monthTitle,
} from "@/services/calendarUtils";

describe("calendar.tsx utils", () => {
  test("pad2", () => {
    expect(pad2(0)).toBe("00");
    expect(pad2(3)).toBe("03");
    expect(pad2(10)).toBe("10");
  });

  test("parseISO", () => {
    expect(parseISO()).toBeNull();
    expect(parseISO("bad")).toBeNull();

    const d = parseISO("2026-02-27T10:30:00.000Z");
    expect(d).toBeInstanceOf(Date);
  });

  test("dateKeyFromDate / dateKey", () => {
    const d = new Date(2026, 1, 7);
    expect(dateKeyFromDate(d)).toBe("2026-02-07");

    expect(dateKey(undefined)).toBe("unknown");
    expect(dateKey("bad")).toBe("unknown");
    expect(dateKey("2026-02-27T12:00:00.000Z")).toMatch(/^2026-02-27$/);
  });

  test("formatDayHeader suffix rules", () => {
    expect(formatDayHeader(new Date(2026, 0, 1))).toContain("1st");
    expect(formatDayHeader(new Date(2026, 0, 2))).toContain("2nd");
    expect(formatDayHeader(new Date(2026, 0, 3))).toContain("3rd");
    expect(formatDayHeader(new Date(2026, 0, 4))).toContain("4th");
    expect(formatDayHeader(new Date(2026, 0, 11))).toContain("11th");
    expect(formatDayHeader(new Date(2026, 0, 21))).toContain("21st");
  });

  test("formatTimeRange", () => {
    expect(formatTimeRange(undefined, undefined)).toBe("All day");
    expect(formatTimeRange("2026-02-27", "2026-02-27")).toBe("All day");

    const t = formatTimeRange(
      "2026-02-27T13:09:00.000Z",
      "2026-02-27T14:10:00.000Z",
    );
    expect(t).toMatch(/^\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)$/);
  });

  test("startOfMonth / daysInMonth / monthTitle", () => {
    const s = startOfMonth(new Date(2026, 1, 27));
    expect(s.getDate()).toBe(1);

    expect(daysInMonth(new Date(2024, 1, 1))).toBe(29);
    expect(daysInMonth(new Date(2026, 1, 1))).toBe(28);

    expect(monthTitle(new Date(2026, 1, 1))).toBe("February 2026");
  });
});
