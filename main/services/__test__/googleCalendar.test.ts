jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    getCurrentUser: jest.fn(),
    getTokens: jest.fn(),
  },
}));

const mockMarkDisconnected = jest.fn();
jest.mock("@/hooks/useGoogleAuth", () => ({
  markGoogleCalendarDisconnected: (...args: any[]) =>
    mockMarkDisconnected(...args),
}));

import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  fetchUpcomingCalendarEvents,
  fetchUserCalendars,
  getNextClassEvent,
  fetchNextClassEvent,
  fetchNextClassEventToday,
  getNextClassEventToday,
  NextClassError,
  type CalendarEvent,
  type GoogleCalendarListItem,
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

  describe("fetchUserCalendars", () => {
    test("throws if user not signed in", async () => {
      mockGetCurrentUser.mockReturnValueOnce(null);

      await expect(fetchUserCalendars()).rejects.toThrow(
        "Please sign in to use Google Calendar.",
      );
    });

    test("throws if accessToken missing", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "" });

      await expect(fetchUserCalendars()).rejects.toThrow(
        "Could not get Google access token.",
      );
    });

    test("calls calendarList endpoint with bearer token and maps items (filters missing id + default summary)", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: "primary", summary: "Primary", primary: true },
            { id: "work", summary: "Work", primary: false },
            { id: "noSummary" }, // should get default summary
            { summary: "Missing ID" }, // should be filtered out
          ],
        }),
      });

      const cals = await fetchUserCalendars();

      expect((global as any).fetch).toHaveBeenCalledTimes(1);
      const [url, opts] = (global as any).fetch.mock.calls[0];

      expect(url).toContain(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      );
      expect(url).toContain("maxResults=250");
      expect(url).toContain("showHidden=false");
      expect(opts.headers.Authorization).toBe("Bearer TOKEN123");

      expect(cals).toEqual<GoogleCalendarListItem[]>([
        { id: "primary", summary: "Primary", primary: true },
        { id: "work", summary: "Work", primary: false },
        { id: "noSummary", summary: "Untitled calendar", primary: false },
      ]);
    });

    test("returns empty array when items is missing", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await expect(fetchUserCalendars()).resolves.toEqual([]);
    });

    test("when response not ok, throws formatted error from json.error", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            status: "PERMISSION_DENIED",
            message: "Not allowed",
            errors: [{ reason: "forbidden" }],
          },
        }),
      });

      await expect(fetchUserCalendars()).rejects.toThrow(
        "PERMISSION_DENIED | forbidden | Not allowed",
      );
    });

    test("when response not ok and json is not parseable, throws fallback HTTP error", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("bad json");
        },
      });

      await expect(fetchUserCalendars()).rejects.toThrow(
        "Google Calendar error (HTTP 500).",
      );
    });
  });

  describe("fetchUpcomingCalendarEvents", () => {
    test("throws if user not signed in", async () => {
      mockGetCurrentUser.mockReturnValueOnce(null);

      await expect(fetchUpcomingCalendarEvents()).rejects.toThrow(
        "Please sign in to use Google Calendar.",
      );
    });

    test("throws if accessToken missing", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "" });

      await expect(fetchUpcomingCalendarEvents()).rejects.toThrow(
        "Could not get Google access token.",
      );
    });

    test("calls fetch with bearer token and returns mapped events (dateTime + date)", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

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

    test("encodes calendarId in URL (special characters)", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });

      await fetchUpcomingCalendarEvents("user+test@domain.com");

      const [url] = (global as any).fetch.mock.calls[0];
      expect(url).toContain("calendars/user%2Btest%40domain.com/events");
    });

    test("returns empty array when items is missing", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await expect(fetchUpcomingCalendarEvents()).resolves.toEqual([]);
    });

    test("when response not ok, throws formatted error from json.error", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

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
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

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
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

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
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });

      await expect(getNextClassEvent()).resolves.toBeNull();
    });
  });

  describe("fetchNextClassEvent / fetchNextClassEventToday", () => {
    test("fetchNextClassEvent returns null when no items", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });

      await expect(fetchNextClassEvent("primary")).resolves.toBeNull();
    });

    test("fetchNextClassEvent returns mapped event when item exists", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "E1",
              summary: "COMP 352",
              location: "Hall Building",
              start: { dateTime: "2026-03-01T14:00:00.000Z" },
              end: { dateTime: "2026-03-01T15:00:00.000Z" },
            },
          ],
        }),
      });

      const ev = await fetchNextClassEvent("primary");
      expect(ev).toEqual({
        id: "E1",
        summary: "COMP 352",
        location: "Hall Building",
        startISO: "2026-03-01T14:00:00.000Z",
        endISO: "2026-03-01T15:00:00.000Z",
      });

      const [url] = (global as any).fetch.mock.calls[0];
      expect(url).toContain("maxResults=1");
      expect(url).toContain("singleEvents=true");
      expect(url).toContain("orderBy=startTime");
    });

    test("fetchNextClassEventToday returns null when no items", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [] }),
      });

      await expect(fetchNextClassEventToday("primary")).resolves.toBeNull();

      const [url] = (global as any).fetch.mock.calls[0];
      expect(url).toContain("timeMax=");
    });

    test("fetchNextClassEventToday returns mapped event when item exists (date fallback)", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "E2",
              summary: "SOEN 341",
              location: "Loyola",
              start: { date: "2026-03-01" },
              end: { date: "2026-03-02" },
            },
          ],
        }),
      });

      const ev = await fetchNextClassEventToday("primary");
      expect(ev).toEqual({
        id: "E2",
        summary: "SOEN 341",
        location: "Loyola",
        startISO: "2026-03-01",
        endISO: "2026-03-02",
      });
    });

    test("maps 401/403 to NOT_CONNECTED and calls markGoogleCalendarDisconnected", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

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

      let err: any;
      try {
        await fetchNextClassEvent("primary");
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(NextClassError);
      expect(err.code).toBe("NOT_CONNECTED");
      expect(String(err.message)).toContain("UNAUTHENTICATED");
      expect(mockMarkDisconnected).toHaveBeenCalledTimes(1);
    });

    test("maps 404 to WRONG_CALENDAR", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            status: "NOT_FOUND",
            message: "Not found",
            errors: [{ reason: "notFound" }],
          },
        }),
      });

      let err: any;
      try {
        await fetchNextClassEventToday("bad");
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(NextClassError);
      expect(err.code).toBe("WRONG_CALENDAR");
      expect(String(err.message)).toContain("NOT_FOUND");
    });

    test("maps other errors to API_ERROR (and handles empty json)", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      let err: any;
      try {
        await fetchNextClassEvent("primary");
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(NextClassError);
      expect(err.code).toBe("API_ERROR");
      expect(String(err.message)).toContain("HTTP 500");
    });

    test("when json is not parseable in next-class endpoints, still throws NextClassError with fallback", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("bad json");
        },
      });

      let err: any;
      try {
        await fetchNextClassEventToday("primary");
      } catch (e) {
        err = e;
      }

      expect(err).toBeInstanceOf(NextClassError);
      expect(err.code).toBe("API_ERROR");
      expect(String(err.message)).toContain("HTTP 500");
    });

    test("getNextClassEventToday wrapper returns underlying result", async () => {
      mockGetCurrentUser.mockReturnValueOnce({ user: { email: "a@b.com" } });
      mockGetTokens.mockReturnValueOnce({ accessToken: "TOKEN123" });

      mockFetchOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: "E3",
              summary: "ENGR 202",
              start: { dateTime: "2026-03-01T10:00:00.000Z" },
              end: { dateTime: "2026-03-01T11:00:00.000Z" },
            },
          ],
        }),
      });

      const ev = await getNextClassEventToday("primary");
      expect(ev?.id).toBe("E3");
    });
  });
});
