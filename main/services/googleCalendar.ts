import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { markGoogleCalendarDisconnected } from "@/hooks/useGoogleAuth";

export type CalendarEvent = {
  id: string;
  summary?: string;
  location?: string;
  startISO?: string;
  endISO?: string;
};

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  primary?: boolean;
};

type CalendarListResponse = {
  items?: Array<{
    id: string;
    summary?: string;
    location?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }>;
};

type CalendarListApiResponse = {
  items?: Array<{
    id: string;
    summary?: string;
    primary?: boolean;
  }>;
};

async function getFreshAccessToken(): Promise<string> {
  const currentUser = await GoogleSignin.getCurrentUser();
  if (!currentUser) {
    throw new Error("Please sign in to use Google Calendar.");
  }

  const { accessToken } = await GoogleSignin.getTokens();
  if (!accessToken) {
    throw new Error("Could not get Google access token.");
  }

  return accessToken;
}

export async function fetchUserCalendars(): Promise<GoogleCalendarListItem[]> {
  const token = await getFreshAccessToken();

  const url =
    "https://www.googleapis.com/calendar/v3/users/me/calendarList" +
    "?maxResults=250" +
    "&showHidden=false";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const msg = json?.error?.message ?? "";
  const reason = json?.error?.errors?.[0]?.reason ?? "";
  const status = json?.error?.status ?? "";
  const errText = [status, reason, msg].filter(Boolean).join(" | ");

  if (!res.ok) {
    throw new Error(errText || `Google Calendar error (HTTP ${res.status}).`);
  }

  const data = json as CalendarListApiResponse;
  const items = data.items ?? [];

  return items
    .filter((c) => !!c.id)
    .map((c) => ({
      id: c.id,
      summary: c.summary ?? "Untitled calendar",
      primary: c.primary ?? false,
    }));
}

export async function fetchUpcomingCalendarEvents(
  calendarId: string = "primary",
): Promise<CalendarEvent[]> {
  const token = await getFreshAccessToken();

  const timeMin = new Date().toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId,
    )}/events` +
    `?timeMin=${encodeURIComponent(timeMin)}` +
    "&maxResults=10" +
    "&singleEvents=true" +
    "&orderBy=startTime";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const msg = json?.error?.message ?? "";
  const reason = json?.error?.errors?.[0]?.reason ?? "";
  const status = json?.error?.status ?? "";
  const errText = [status, reason, msg].filter(Boolean).join(" | ");

  if (!res.ok) {
    throw new Error(errText || `Google Calendar error (HTTP ${res.status}).`);
  }

  const data = json as CalendarListResponse;
  const items = data.items ?? [];

  return items.map((e) => ({
    id: e.id,
    summary: e.summary,
    location: e.location,
    startISO: e.start?.dateTime ?? e.start?.date,
    endISO: e.end?.dateTime ?? e.end?.date,
  }));
}

export async function getNextClassEvent(
  calendarId: string = "primary",
): Promise<CalendarEvent | null> {
  const events = await fetchUpcomingCalendarEvents(calendarId);
  return events.length > 0 ? events[0] : null;
}

export type NextClassErrorCode =
  | "NOT_CONNECTED"
  | "WRONG_CALENDAR"
  | "API_ERROR";

export class NextClassError extends Error {
  code: NextClassErrorCode;

  constructor(code: NextClassErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

function endOfTodayISO(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function buildGoogleErrText(json: any): string {
  const msg = json?.error?.message ?? "";
  const reason = json?.error?.errors?.[0]?.reason ?? "";
  const status = json?.error?.status ?? "";
  return [status, reason, msg].filter(Boolean).join(" | ");
}

function toNextClassError(res: Response, errText: string): NextClassError {
  if (res.status === 401 || res.status === 403) {
    markGoogleCalendarDisconnected?.();
    return new NextClassError(
      "NOT_CONNECTED",
      errText || "Google Calendar isn’t connected.",
    );
  }
  if (res.status === 404) {
    return new NextClassError(
      "WRONG_CALENDAR",
      errText || "Selected calendar not found or not accessible.",
    );
  }
  return new NextClassError(
    "API_ERROR",
    errText || `Google Calendar error (HTTP ${res.status}).`,
  );
}

/**
 * Fetch the next scheduled class/event AFTER NOW (can be tomorrow/next week).
 * Returns null if there are no upcoming events at all.
 */
export async function fetchNextClassEvent(
  calendarId: string = "primary",
): Promise<CalendarEvent | null> {
  const token = await getFreshAccessToken();

  const timeMin = new Date().toISOString();
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId,
    )}/events` +
    `?timeMin=${encodeURIComponent(timeMin)}` +
    "&maxResults=1" +
    "&singleEvents=true" +
    "&orderBy=startTime";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const errText = buildGoogleErrText(json);

  if (!res.ok) {
    throw toNextClassError(res, errText);
  }

  const data = json as CalendarListResponse;
  const e = data.items?.[0];
  if (!e) return null;

  return {
    id: e.id,
    summary: e.summary,
    location: e.location,
    startISO: e.start?.dateTime ?? e.start?.date,
    endISO: e.end?.dateTime ?? e.end?.date,
  };
}

/**
 * Fetch the next scheduled class/event from now until end of today.
 * Returns null if no more events today.
 */
export async function fetchNextClassEventToday(
  calendarId: string = "primary",
): Promise<CalendarEvent | null> {
  const token = await getFreshAccessToken();

  const timeMin = new Date().toISOString();
  const timeMax = endOfTodayISO();

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId,
    )}/events` +
    `?timeMin=${encodeURIComponent(timeMin)}` +
    `&timeMax=${encodeURIComponent(timeMax)}` +
    "&maxResults=1" +
    "&singleEvents=true" +
    "&orderBy=startTime";

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  const errText = buildGoogleErrText(json);

  if (!res.ok) {
    throw toNextClassError(res, errText);
  }

  const data = json as CalendarListResponse;
  const e = data.items?.[0];
  if (!e) return null;

  return {
    id: e.id,
    summary: e.summary,
    location: e.location,
    startISO: e.start?.dateTime ?? e.start?.date,
    endISO: e.end?.dateTime ?? e.end?.date,
  };
}

/** Optional convenience wrapper */
export async function getNextClassEventToday(
  calendarId: string = "primary",
): Promise<CalendarEvent | null> {
  return fetchNextClassEventToday(calendarId);
}
