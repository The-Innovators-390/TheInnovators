import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
    googleCalendarFacade,
} from "@/services/google/facades/GoogleCalendarFacade";
import {
    isGoogleCalendarConnected,
    requestGoogleCalendarAccess,
} from "@/hooks/useGoogleAuth";
import {
    fetchUpcomingCalendarEvents,
    fetchUserCalendars,
} from "@/services/googleCalendar";

jest.mock("@react-native-google-signin/google-signin", () => ({
    GoogleSignin: {
        getCurrentUser: jest.fn(),
    },
}));

jest.mock("@/hooks/useGoogleAuth", () => ({
    isGoogleCalendarConnected: jest.fn(),
    requestGoogleCalendarAccess: jest.fn(),
}));

jest.mock("@/services/googleCalendar", () => ({
    fetchUpcomingCalendarEvents: jest.fn(),
    fetchUserCalendars: jest.fn(),
}));

describe("GoogleCalendarFacade", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("getConnectionState", () => {
        it("returns signedIn true and calendarConnected true", async () => {
            (GoogleSignin.getCurrentUser as jest.Mock).mockReturnValue({ id: "u1" });
            (isGoogleCalendarConnected as jest.Mock).mockResolvedValue(true);

            const result = await googleCalendarFacade.getConnectionState();

            expect(result).toEqual({
                signedIn: true,
                calendarConnected: true,
            });
        });

        it("returns signedIn false and calendarConnected false", async () => {
            (GoogleSignin.getCurrentUser as jest.Mock).mockReturnValue(null);
            (isGoogleCalendarConnected as jest.Mock).mockResolvedValue(false);

            const result = await googleCalendarFacade.getConnectionState();

            expect(result).toEqual({
                signedIn: false,
                calendarConnected: false,
            });
        });
    });

    describe("connectCalendar", () => {
        it("requests calendar access and returns refreshed state", async () => {
            (requestGoogleCalendarAccess as jest.Mock).mockResolvedValue(undefined);
            (GoogleSignin.getCurrentUser as jest.Mock).mockReturnValue({ id: "u1" });
            (isGoogleCalendarConnected as jest.Mock).mockResolvedValue(true);

            const result = await googleCalendarFacade.connectCalendar();

            expect(requestGoogleCalendarAccess).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                signedIn: true,
                calendarConnected: true,
            });
        });
    });

    describe("getCalendars", () => {
        it("delegates to fetchUserCalendars", async () => {
            const calendars = [
                { id: "primary", summary: "Primary", primary: true },
            ];
            (fetchUserCalendars as jest.Mock).mockResolvedValue(calendars);

            const result = await googleCalendarFacade.getCalendars();

            expect(fetchUserCalendars).toHaveBeenCalledTimes(1);
            expect(result).toEqual(calendars);
        });
    });

    describe("getEvents", () => {
        it("delegates to fetchUpcomingCalendarEvents", async () => {
            const events = [
                {
                    summary: "Class 1",
                    start: { dateTime: "2026-04-04T10:00:00Z" },
                },
            ];
            (fetchUpcomingCalendarEvents as jest.Mock).mockResolvedValue(events);

            const result = await googleCalendarFacade.getEvents("primary");

            expect(fetchUpcomingCalendarEvents).toHaveBeenCalledWith("primary");
            expect(result).toEqual(events);
        });
    });

    describe("resolveDefaultCalendarId", () => {
        it("returns currentCalendarId when it is not primary", () => {
            const calendars = [
                { id: "primary", summary: "Primary", primary: true },
                { id: "class-cal", summary: "Classes" },
            ];

            const result = googleCalendarFacade.resolveDefaultCalendarId(
                calendars as any,
                "class-cal",
            );

            expect(result).toBe("class-cal");
        });

        it("returns primary calendar id when currentCalendarId is primary", () => {
            const calendars = [
                { id: "school123", summary: "Primary", primary: true },
            ];

            const result = googleCalendarFacade.resolveDefaultCalendarId(
                calendars as any,
                "primary",
            );

            expect(result).toBe("school123");
        });

        it("falls back to primary string when no primary calendar exists", () => {
            const calendars = [{ id: "other", summary: "Other" }];

            const result = googleCalendarFacade.resolveDefaultCalendarId(
                calendars as any,
                "primary",
            );

            expect(result).toBe("primary");
        });
    });

    describe("loadScreenData", () => {
        it("returns empty data when user is not signed in", async () => {
            (GoogleSignin.getCurrentUser as jest.Mock).mockReturnValue(null);
            (isGoogleCalendarConnected as jest.Mock).mockResolvedValue(false);

            const result = await googleCalendarFacade.loadScreenData("primary");

            expect(result).toEqual({
                auth: {
                    signedIn: false,
                    calendarConnected: false,
                },
                calendars: [],
                events: [],
                activeCalendarId: "primary",
            });

            expect(fetchUserCalendars).not.toHaveBeenCalled();
            expect(fetchUpcomingCalendarEvents).not.toHaveBeenCalled();
        });

        it("returns empty data when signed in but calendar not connected", async () => {
            (GoogleSignin.getCurrentUser as jest.Mock).mockReturnValue({ id: "u1" });
            (isGoogleCalendarConnected as jest.Mock).mockResolvedValue(false);

            const result = await googleCalendarFacade.loadScreenData("primary");

            expect(result).toEqual({
                auth: {
                    signedIn: true,
                    calendarConnected: false,
                },
                calendars: [],
                events: [],
                activeCalendarId: "primary",
            });

            expect(fetchUserCalendars).not.toHaveBeenCalled();
            expect(fetchUpcomingCalendarEvents).not.toHaveBeenCalled();
        });

        it("loads calendars and events when signed in and connected", async () => {
            const calendars = [
                { id: "school123", summary: "Primary", primary: true },
                { id: "other", summary: "Other" },
            ];
            const events = [
                {
                    summary: "Class 1",
                    start: { dateTime: "2026-04-04T10:00:00Z" },
                },
            ];

            (GoogleSignin.getCurrentUser as jest.Mock).mockReturnValue({ id: "u1" });
            (isGoogleCalendarConnected as jest.Mock).mockResolvedValue(true);
            (fetchUserCalendars as jest.Mock).mockResolvedValue(calendars);
            (fetchUpcomingCalendarEvents as jest.Mock).mockResolvedValue(events);

            const result = await googleCalendarFacade.loadScreenData("primary");

            expect(fetchUserCalendars).toHaveBeenCalledTimes(1);
            expect(fetchUpcomingCalendarEvents).toHaveBeenCalledWith("school123");

            expect(result).toEqual({
                auth: {
                    signedIn: true,
                    calendarConnected: true,
                },
                calendars,
                events,
                activeCalendarId: "school123",
            });
        });

        it("uses preferred non-primary calendar id directly", async () => {
            const calendars = [
                { id: "primary-id", summary: "Primary", primary: true },
                { id: "class-cal", summary: "Classes" },
            ];
            const events = [{ summary: "Class A" }];

            (GoogleSignin.getCurrentUser as jest.Mock).mockReturnValue({ id: "u1" });
            (isGoogleCalendarConnected as jest.Mock).mockResolvedValue(true);
            (fetchUserCalendars as jest.Mock).mockResolvedValue(calendars);
            (fetchUpcomingCalendarEvents as jest.Mock).mockResolvedValue(events);

            const result = await googleCalendarFacade.loadScreenData("class-cal");

            expect(fetchUpcomingCalendarEvents).toHaveBeenCalledWith("class-cal");
            expect(result.activeCalendarId).toBe("class-cal");
        });
    });

    describe("reloadEventsForCalendar", () => {
        it("delegates to getEvents", async () => {
            const events = [{ summary: "Exam" }];
            (fetchUpcomingCalendarEvents as jest.Mock).mockResolvedValue(events);

            const result =
                await googleCalendarFacade.reloadEventsForCalendar("class-cal");

            expect(fetchUpcomingCalendarEvents).toHaveBeenCalledWith("class-cal");
            expect(result).toEqual(events);
        });
    });
});