import React, { useCallback, useEffect, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

import {
  configureGoogleSignIn,
  signInWithGoogle,
  requestGoogleCalendarAccess,
  isGoogleCalendarConnected,
} from "@/hooks/useGoogleAuth";

import {
  fetchUpcomingCalendarEvents,
  fetchUserCalendars,
  type GoogleCalendarListItem,
  type CalendarEvent,
} from "@/services/googleCalendar";

import { styles } from "@/components/calendar/calendarStyles";

import { useCalendarDerived } from "@/hooks/useCalendarDerived";

import MonthCalendarCard from "@/components/calendar/MonthCalendarCard";

import UpcomingEvents from "@/components/calendar/UpcomingEvents";

import OtherCalendars from "@/components/calendar/OtherCalendars";

export default function CalendarScreen() {
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [signedIn, setSignedIn] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [calendarsError, setCalendarsError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);

  const [activeCalendarId, setActiveCalendarId] = useState<string>("primary");

  // dropdown selection (user picks here before applying)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingCalendarId, setPendingCalendarId] = useState<string>("primary");

  // calendar month state (starts at “now”)
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  const pendingCalendarName =
    calendars.find((c) => c.id === pendingCalendarId)?.summary ?? "Primary";

  // prevents the alert from popping multiple times on re-render
  const promptedRef = useRef(false);

  const goToMap = useCallback(() => {
    router.replace("/(tabs)/map");
  }, []);

  const refreshState = useCallback(async () => {
    const user = await GoogleSignin.getCurrentUser();
    const connected = await isGoogleCalendarConnected();

    const signedInNow = !!user;

    setSignedIn(signedInNow);
    setCalendarConnected(connected);

    return { signedInNow, connected };
  }, []);

  const loadCalendars = useCallback(async () => {
    try {
      setCalendarsError(null);
      setCalendarsLoading(true);

      const list = await fetchUserCalendars();
      setCalendars(list);

      // pick default: primary if available, else first
      const primaryId = list.find((c) => c.primary)?.id ?? "primary";

      // only initialize if still on default values
      setActiveCalendarId((prev) => (prev === "primary" ? primaryId : prev));
      setPendingCalendarId((prev) => (prev === "primary" ? primaryId : prev));
    } catch (e: any) {
      setCalendars([]);
      setCalendarsError(e?.message ?? "Could not load calendars.");
    } finally {
      setCalendarsLoading(false);
    }
  }, []);

  const loadEvents = useCallback(
    async (calendarId?: string) => {
      const id = calendarId ?? activeCalendarId;
      try {
        setEventsError(null);
        setEventsLoading(true);
        const list = await fetchUpcomingCalendarEvents(id);
        setEvents(list);
      } catch (e: any) {
        setEvents([]);
        setEventsError(e?.message ?? "Could not load calendar events.");
      } finally {
        setEventsLoading(false);
      }
    },
    [activeCalendarId],
  );

  useEffect(() => {
    (async () => {
      try {
        configureGoogleSignIn();
      } catch {
        // ignore if already configured
      }
      await refreshState();
      setLoading(false);
    })();
  }, [refreshState]);

  // Reset prompt flag when leaving calendar screen
  useEffect(() => {
    if (!isFocused) promptedRef.current = false;
  }, [isFocused]);

  // Prevents overlapping Google token requests (getTokens)
  const fetchBusyRef = useRef(false);

  // To insure loadCalendars + loadEvents don't run concurrently
  const runFetchCycle = useCallback(async () => {
    if (fetchBusyRef.current) return;
    fetchBusyRef.current = true;

    try {
      const { signedInNow, connected } = await refreshState();
      if (signedInNow && connected) {
        await loadCalendars();
        await loadEvents();
      }
    } finally {
      fetchBusyRef.current = false;
    }
  }, [refreshState, loadCalendars, loadEvents]);

  // Only run fetches when calendar screen is focused
  useEffect(() => {
    if (!isFocused) return;
    if (loading) return;
    runFetchCycle();
  }, [isFocused, loading, runFetchCycle]);

  // If user is signed in but calendar is NOT connected -> prompt to connect
  useEffect(() => {
    if (!isFocused) return;
    if (loading) return;
    if (!signedIn) return;
    if (calendarConnected) return;
    if (promptedRef.current) return;

    promptedRef.current = true;

    Alert.alert(
      "Connect Google Calendar?",
      'Connect your Google Calendar account to have access to the "Directions to my next class" feature!',
      [
        { text: "Not now", style: "cancel", onPress: goToMap },
        {
          text: "Connect",
          onPress: async () => {
            try {
              setLoading(true);
              await requestGoogleCalendarAccess();
              await runFetchCycle();
            } catch (e: any) {
              Alert.alert(
                "Calendar not connected",
                e?.message ?? "You can connect it later.",
              );
              goToMap();
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [isFocused, loading, signedIn, calendarConnected, goToMap, runFetchCycle]);

  const onSignInPress = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      await runFetchCycle();
    } catch (e: any) {
      Alert.alert(
        "Google Sign-In failed",
        e?.message ?? "Sign-in was cancelled or failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runFetchCycle();
    } finally {
      setRefreshing(false);
    }
  }, [runFetchCycle]);

  const { eventDaySet, monthGrid, todayKey, grouped } = useCalendarDerived(
    events,
    monthCursor,
  );

  // NOT signed in
  if (!signedIn) {
    return (
      <View style={styles.center}>
        <Text style={styles.header}>Not logged in!</Text>
        <Text style={styles.body}>
          Connect to your Google Calendar account to have access to the{"\n"}
          “Directions to my next class” feature!
        </Text>

        <Pressable style={styles.googleBtn} onPress={onSignInPress}>
          <Text style={styles.googleBtnText}>Sign in with Google</Text>
        </Pressable>

        <Pressable style={styles.redBtn} onPress={goToMap}>
          <Text style={styles.redBtnText}>Return to map</Text>
        </Pressable>
      </View>
    );
  }

  // Signed in but not connected (fallback UI; alert also appears)
  if (!calendarConnected) {
    return (
      <View style={styles.center}>
        <Text style={styles.header}>Connect Google Calendar</Text>
        <Text style={styles.body}>
          Connect your Google Calendar account to have access to the{"\n"}
          “Directions to my next class” feature!
        </Text>

        <Pressable
          style={styles.googleBtn}
          onPress={async () => {
            try {
              setLoading(true);
              await requestGoogleCalendarAccess();
              await runFetchCycle();
            } catch (e: any) {
              Alert.alert(
                "Calendar not connected",
                e?.message ?? "You can connect it later.",
              );
              goToMap();
            } finally {
              setLoading(false);
            }
          }}
        >
          <Text style={styles.googleBtnText}>Connect Google Calendar</Text>
        </Pressable>

        <Pressable style={styles.redBtn} onPress={goToMap}>
          <Text style={styles.redBtnText}>Return to map</Text>
        </Pressable>
      </View>
    );
  }

  // Connected: real calendar + upcoming events
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <MonthCalendarCard
        monthCursor={monthCursor}
        setMonthCursor={setMonthCursor}
        monthGrid={monthGrid}
        todayKey={todayKey}
        eventDaySet={eventDaySet}
        styles={styles}
      />

      <UpcomingEvents
        eventsLoading={eventsLoading}
        eventsError={eventsError}
        events={events}
        grouped={grouped}
        styles={styles}
        onPressDirections={(e) =>
          Alert.alert(
            "Directions",
            "Next step: connect this to your directions feature.",
          )
        }
      />

      <OtherCalendars
        calendarsLoading={calendarsLoading}
        calendarsError={calendarsError}
        calendars={calendars}
        pickerOpen={pickerOpen}
        setPickerOpen={setPickerOpen}
        pendingCalendarId={pendingCalendarId}
        setPendingCalendarId={setPendingCalendarId}
        pendingCalendarName={pendingCalendarName}
        activeCalendarId={activeCalendarId}
        onSelectCalendar={async () => {
          setActiveCalendarId(pendingCalendarId);
          await loadEvents(pendingCalendarId);
        }}
        styles={styles}
      />
    </ScrollView>
  );
}
