jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    getCurrentUser: jest.fn(),
    getTokens: jest.fn(),
  },
}));

jest.mock("@/hooks/useGoogleAuth", () => ({
  markGoogleCalendarDisconnected: jest.fn(),
}));

import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  fetchUpcomingCalendarEvents,
  getNextClassEvent,
  type CalendarEvent,
} from "@/services/googleCalendar";

const mockGetCurrentUser = GoogleSignin.getCurrentUser as jest.Mock;
const mockGetTokens = GoogleSignin.getTokens as jest.Mock;

function mockFetchOnce(response: {
  ok: boolean;
  status: number;
  json?: () => Promise<any>;
}) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status,
    json: response.json ?? (async () => ({})),
  });
}

describe("services/googleCalendar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchUpcomingCalendarEvents", () => {
    test("throws if user not signed in", async () => {
      mockGetCurrentUser.mockResolvedValueOnce(null);

      await expect(fetchUpcomingCalendarEvents()).rejects.toThrow(
        "Please sign in to use Google Calendar.",
      );
    });

    test("throws if accessToken missing", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockResolvedValueOnce({ accessToken: "" });

      await expect(fetchUpcomingCalendarEvents()).rejects.toThrow(
        "Could not get Google access token.",
      );
    });

    test("calls fetch with bearer token and returns mapped events (dateTime + date)", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockResolvedValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "1",
              summary: "Timed",
              location: "Room A",
              start: { dateTime: "2026-02-27T14:00:00.000Z" },
              end: { dateTime: "2026-02-27T15:00:00.000Z" },
            },
            {
              id: "2",
              summary: "All day",
              location: "Campus",
              start: { date: "2026-02-28" },
              end: { date: "2026-03-01" },
            },
          ],
        }),
      });

      const events = await fetchUpcomingCalendarEvents();

      expect((global as any).fetch).toHaveBeenCalledTimes(1);
      const [url, opts] = (global as any).fetch.mock.calls[0];

      expect(url).toContain(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      );
      expect(url).toContain("timeMin=");
      expect(url).toContain("maxResults=10");
      expect(url).toContain("singleEvents=true");
      expect(url).toContain("orderBy=startTime");

      expect(opts.headers.Authorization).toBe("Bearer TOKEN123");

      expect(events).toEqual<CalendarEvent[]>([
        {
          id: "1",
          summary: "Timed",
          location: "Room A",
          startISO: "2026-02-27T14:00:00.000Z",
          endISO: "2026-02-27T15:00:00.000Z",
        },
        {
          id: "2",
          summary: "All day",
          location: "Campus",
          startISO: "2026-02-28",
          endISO: "2026-03-01",
        },
      ]);
    });

    test("returns empty array when items is missing", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockResolvedValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({}), // no items
      });

      await expect(fetchUpcomingCalendarEvents()).resolves.toEqual([]);
    });

    test("when response not ok, throws formatted error from json.error", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockResolvedValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            status: "UNAUTHENTICATED",
            message: "Invalid Credentials",
            errors: [{ reason: "authError" }],
          },
        }),
      });

      await expect(fetchUpcomingCalendarEvents()).rejects.toThrow(
        "UNAUTHENTICATED | authError | Invalid Credentials",
      );
    });

    test("when response not ok and json is not parseable, throws fallback HTTP error", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockResolvedValueOnce({ accessToken: "TOKEN123" });

      // json() throws -> your code sets json=null
      mockFetchOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("bad json");
        },
      });

      await expect(fetchUpcomingCalendarEvents()).rejects.toThrow(
        "Google Calendar error (HTTP 500).",
      );
    });
  });

  describe("getNextClassEvent", () => {
    test("returns first event when list non-empty", async () => {
      // We can drive behavior by mocking fetchUpcomingCalendarEvents indirectly via fetch
      mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockResolvedValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "1",
              summary: "Next",
              start: { dateTime: "2026-02-27T14:00:00.000Z" },
              end: { dateTime: "2026-02-27T15:00:00.000Z" },
            },
          ],
        }),
      });

      const ev = await getNextClassEvent();
      expect(ev?.id).toBe("1");
      expect(ev?.summary).toBe("Next");
    });

    test("returns null when no events", async () => {
      mockGetCurrentUser.mockResolvedValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockResolvedValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });

      await expect(getNextClassEvent()).resolves.toBeNull();
    });
  });
});
