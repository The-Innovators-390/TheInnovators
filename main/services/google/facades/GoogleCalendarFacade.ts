import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  isGoogleCalendarConnected,
  requestGoogleCalendarAccess,
} from "@/hooks/useGoogleAuth";
import {
  fetchUpcomingCalendarEvents,
  fetchUserCalendars,
  type GoogleCalendarListItem,
  type CalendarEvent,
} from "@/services/googleCalendar";

export type CalendarConnectionState = {
  signedIn: boolean;
  calendarConnected: boolean;
};

export type CalendarScreenData = {
  auth: CalendarConnectionState;
  calendars: GoogleCalendarListItem[];
  events: CalendarEvent[];
  activeCalendarId: string;
};

export class GoogleCalendarFacade {
  async getConnectionState(): Promise<CalendarConnectionState> {
    const user = GoogleSignin.getCurrentUser();
    const calendarConnected = await isGoogleCalendarConnected();

    return {
      signedIn: !!user,
      calendarConnected,
    };
  }

  async connectCalendar(): Promise<CalendarConnectionState> {
    await requestGoogleCalendarAccess();
    return this.getConnectionState();
  }

  async getCalendars(): Promise<GoogleCalendarListItem[]> {
    return fetchUserCalendars();
  }

  async getEvents(calendarId: string): Promise<CalendarEvent[]> {
    return fetchUpcomingCalendarEvents(calendarId);
  }

  resolveDefaultCalendarId(
    calendars: GoogleCalendarListItem[],
    currentCalendarId: string,
  ): string {
    if (currentCalendarId !== "primary") {
      return currentCalendarId;
    }

    return calendars.find((c) => c.primary)?.id ?? "primary";
  }

  async loadScreenData(
    preferredCalendarId: string = "primary",
  ): Promise<CalendarScreenData> {
    const auth = await this.getConnectionState();

    if (!auth.signedIn || !auth.calendarConnected) {
      return {
        auth,
        calendars: [],
        events: [],
        activeCalendarId: preferredCalendarId,
      };
    }

    const calendars = await this.getCalendars();
    const activeCalendarId = this.resolveDefaultCalendarId(
      calendars,
      preferredCalendarId,
    );
    const events = await this.getEvents(activeCalendarId);

    return {
      auth,
      calendars,
      events,
      activeCalendarId,
    };
  }

  async reloadEventsForCalendar(calendarId: string): Promise<CalendarEvent[]> {
    return this.getEvents(calendarId);
  }
}

export const googleCalendarFacade = new GoogleCalendarFacade();
