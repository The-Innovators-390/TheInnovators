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

import { configureGoogleSignIn, signInWithGoogle } from "@/hooks/useGoogleAuth";
import { googleCalendarFacade } from "@/services/google/facades/GoogleCalendarFacade";

import type {
  GoogleCalendarListItem,
  CalendarEvent,
} from "@/services/googleCalendar";

import { parseLocationDetails } from "@/services/calendarUtils";
import { findRoomNode } from "@/services/indoorNavigationMapping";

import { SGW_BUILDINGS } from "@/components/Buildings/SGW/SGWBuildings";
import { LOYOLA_BUILDINGS } from "@/components/Buildings/Loyola/LoyolaBuildings";
import { getDeviceLocation } from "@/components/campus/helper_methods/locationUtils";
import { getBuildingContainingPoint } from "@/components/campus/helper_methods/campusMap.buildings";
import { indoorData } from "@/components/indoors/indoorData";

import { styles } from "@/components/calendar/calendarStyles";

import { useCalendarDerived } from "@/hooks/useCalendarDerived";

import MonthCalendarCard from "@/components/calendar/MonthCalendarCard";
import FindNextClass from "@/components/calendar/FindNextClass";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingCalendarId, setPendingCalendarId] = useState<string>("primary");
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  const pendingCalendarName =
    calendars.find((c) => c.id === pendingCalendarId)?.summary ?? "Primary";

  const promptedRef = useRef(false);
  const fetchBusyRef = useRef(false);

  const goToMap = useCallback(() => {
    router.replace("/(tabs)/map");
  }, []);

  const handlePressDirections = useCallback(async (event: CalendarEvent) => {
    if (!event.location?.trim()) {
      Alert.alert("No Location", "This event has no location information.");
      return;
    }

    const { building, room } = parseLocationDetails(event.location);

    if (!building) {
      Alert.alert(
        "Location not found",
        `We couldn't find a Concordia building for: "${event.location}".`,
      );
      return;
    }

    let extraParams = {};
    if (room) {
      const roomNode = findRoomNode(building.code, room);
      if (roomNode) {
        extraParams = {
          externalDestRoomNodeId: roomNode.id,
          externalDestRoomLabel: roomNode.label ?? room,
          externalDestBuildingCode: building.code,
        };
      }
    }

    const startLocation = await getDeviceLocation().catch(() => null);
    if (startLocation) {
      const allBuildings = [...SGW_BUILDINGS, ...LOYOLA_BUILDINGS];
      const startBuilding = getBuildingContainingPoint(
        allBuildings,
        startLocation.latitude,
        startLocation.longitude,
      );

      if (startBuilding && indoorData[startBuilding.code]) {
        extraParams = {
          ...extraParams,
          indoorStartBuildingCode: startBuilding.code,
          indoorStartBuildingId: startBuilding.id,
          indoorStartLabel: "Your current room",
        };
      }
    }

    router.push({
      pathname: "/(tabs)/map",
      params: {
        destBuildingId: building.id,
        ...extraParams,
      },
    });
  }, []);

  const refreshState = useCallback(async () => {
    const state = await googleCalendarFacade.getConnectionState();

    setSignedIn(state.signedIn);
    setCalendarConnected(state.calendarConnected);

    return {
      signedInNow: state.signedIn,
      connected: state.calendarConnected,
    };
  }, []);

  const loadCalendarScreenData = useCallback(
    async (preferredCalendarId?: string) => {
      try {
        setCalendarsError(null);
        setEventsError(null);
        setCalendarsLoading(true);
        setEventsLoading(true);

        const data = await googleCalendarFacade.loadScreenData(
          preferredCalendarId ?? activeCalendarId,
        );

        setSignedIn(data.auth.signedIn);
        setCalendarConnected(data.auth.calendarConnected);
        setCalendars(data.calendars);
        setEvents(data.events);
        setActiveCalendarId(data.activeCalendarId);
        setPendingCalendarId(data.activeCalendarId);
      } catch (e: any) {
        setCalendars([]);
        setEvents([]);
        setCalendarsError(e?.message ?? "Could not load calendars.");
        setEventsError(e?.message ?? "Could not load calendar events.");
      } finally {
        setCalendarsLoading(false);
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

  useEffect(() => {
    if (!isFocused) promptedRef.current = false;
  }, [isFocused]);

  const runFetchCycle = useCallback(async () => {
    if (fetchBusyRef.current) return;
    fetchBusyRef.current = true;

    try {
      const { signedInNow, connected } = await refreshState();

      if (signedInNow && connected) {
        await loadCalendarScreenData();
      } else {
        setCalendars([]);
        setEvents([]);
      }
    } finally {
      fetchBusyRef.current = false;
    }
  }, [refreshState, loadCalendarScreenData]);

  useEffect(() => {
    if (!isFocused) return;
    if (loading) return;
    runFetchCycle();
  }, [isFocused, loading, runFetchCycle]);

  const handleConnectCalendar = useCallback(async () => {
    try {
      setLoading(true);

      const state = await googleCalendarFacade.connectCalendar();
      setSignedIn(state.signedIn);
      setCalendarConnected(state.calendarConnected);

      await loadCalendarScreenData();
    } catch (e: any) {
      Alert.alert(
        "Calendar not connected",
        e?.message ?? "You can connect it later.",
      );
      goToMap();
    } finally {
      setLoading(false);
    }
  }, [goToMap, loadCalendarScreenData]);

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
          onPress: () => {
            void handleConnectCalendar();
          },
        },
      ],
    );
  }, [
    isFocused,
    loading,
    signedIn,
    calendarConnected,
    goToMap,
    handleConnectCalendar,
  ]);

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

  const handleSelectCalendar = useCallback(async () => {
    try {
      setEventsError(null);
      setEventsLoading(true);

      const nextEvents =
        await googleCalendarFacade.reloadEventsForCalendar(pendingCalendarId);

      setActiveCalendarId(pendingCalendarId);
      setEvents(nextEvents);
    } catch (e: any) {
      setEvents([]);
      setEventsError(e?.message ?? "Could not load calendar events.");
    } finally {
      setEventsLoading(false);
    }
  }, [pendingCalendarId]);

  const { eventDaySet, monthGrid, todayKey, grouped } = useCalendarDerived(
    events,
    monthCursor,
  );

  if (!signedIn) {
    return (
      <View style={styles.center} testID="calendar-notSignedIn">
        <Text style={styles.header} testID="calendar-notSignedIn-header">
          Not logged in!
        </Text>
        <Text style={styles.body}>
          Connect to your Google Calendar account to have access to the{"\n"}
          “Directions to my next class” feature!
        </Text>

        <Pressable
          style={styles.googleBtn}
          onPress={onSignInPress}
          testID="calendar-signInButton"
        >
          <Text style={styles.googleBtnText}>Sign in with Google</Text>
        </Pressable>

        <Pressable
          style={styles.redBtn}
          onPress={goToMap}
          testID="calendar-returnToMap"
        >
          <Text style={styles.redBtnText}>Return to map</Text>
        </Pressable>
      </View>
    );
  }

  if (!calendarConnected) {
    return (
      <View style={styles.center} testID="calendar-notConnected">
        <Text style={styles.header} testID="calendar-notConnected-header">
          Connect Google Calendar
        </Text>
        <Text style={styles.body}>
          Connect your Google Calendar account to have access to the{"\n"}
          “Directions to my next class” feature!
        </Text>

        <Pressable
          testID="calendar-connectCalendarButton"
          style={styles.googleBtn}
          onPress={handleConnectCalendar}
        >
          <Text style={styles.googleBtnText}>Connect Google Calendar</Text>
        </Pressable>

        <Pressable
          style={styles.redBtn}
          onPress={goToMap}
          testID="calendar-returnToMap"
        >
          <Text style={styles.redBtnText}>Return to map</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      testID="calendar-connected"
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

      <FindNextClass
        calendarId={activeCalendarId}
        onPressDirections={handlePressDirections}
      />

      <UpcomingEvents
        eventsLoading={eventsLoading}
        eventsError={eventsError}
        events={events}
        grouped={grouped}
        styles={styles}
        onPressDirections={handlePressDirections}
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
        onSelectCalendar={handleSelectCalendar}
        styles={styles}
      />
    </ScrollView>
  );
}