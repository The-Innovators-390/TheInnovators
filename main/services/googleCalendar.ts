import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { markGoogleCalendarDisconnected } from "@/hooks/useGoogleAuth";

export type CalendarEvent = {
  id: string;
  summary?: string;
  location?: string;
  startISO?: string;
  endISO?: string;
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

export async function fetchUpcomingCalendarEvents(): Promise<CalendarEvent[]> {
  const token = await getFreshAccessToken();

  const timeMin = new Date().toISOString();
  const url =
    "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
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
export async function getNextClassEvent(): Promise<CalendarEvent | null> {
  const events = await fetchUpcomingCalendarEvents();
  return events.length > 0 ? events[0] : null;
}
