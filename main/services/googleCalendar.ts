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
