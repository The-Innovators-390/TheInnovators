import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
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
  type CalendarEvent,
} from "@/services/googleCalendar";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function parseISO(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dateKey(startISO?: string) {
  const d = parseISO(startISO);
  if (!d) return "unknown";
  return dateKeyFromDate(d);
}

function formatDayHeader(d: Date) {
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${weekdays[d.getDay()]} ${months[d.getMonth()]} ${day}${suffix} ${d.getFullYear()}`;
}

function formatTimeRange(startISO?: string, endISO?: string) {
  const s = parseISO(startISO);
  const e = parseISO(endISO);

  if (!s || !e) return "All day";
  const startHasTime = startISO?.includes("T");
  const endHasTime = endISO?.includes("T");
  if (!startHasTime || !endHasTime) return "All day";

  const to12 = (d: Date) => {
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${pad2(m)} ${ampm}`;
  };

  return `${to12(s)} - ${to12(e)}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function monthTitle(d: Date) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

//will need to remove
export const __test__ = {
  pad2,
  parseISO,
  dateKeyFromDate,
  dateKey,
  formatDayHeader,
  formatTimeRange,
  startOfMonth,
  daysInMonth,
  monthTitle,
};

export default function CalendarScreen() {
  const isFocused = useIsFocused();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [signedIn, setSignedIn] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // calendar month state (starts at “now”)
  const [monthCursor, setMonthCursor] = useState(() => new Date());

  // prevents the alert from popping multiple times on re-render
  const promptedRef = useRef(false);

  const goToMap = () => router.replace("/(tabs)/map");

  const refreshState = useCallback(async () => {
    const user = await GoogleSignin.getCurrentUser();
    setSignedIn(!!user);

    const connected = await isGoogleCalendarConnected();
    setCalendarConnected(connected);
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setEventsError(null);
      setEventsLoading(true);
      const list = await fetchUpcomingCalendarEvents();
      setEvents(list);
    } catch (e: any) {
      setEvents([]);
      setEventsError(e?.message ?? "Could not load calendar events.");
    } finally {
      setEventsLoading(false);
    }
  }, []);

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

  // Only run fetches when calendar screen is focused
  useEffect(() => {
    if (!isFocused) return;
    if (loading) return;

    (async () => {
      await refreshState();
      const connected = await isGoogleCalendarConnected();
      if (connected) {
        await loadEvents();
      }
    })();
  }, [isFocused, loading, refreshState, loadEvents]);

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
          onPress: () => {
            void (async () => {
              try {
                setLoading(true);
                await requestGoogleCalendarAccess();
                await refreshState();
                await loadEvents();
              } catch (e: any) {
                Alert.alert(
                  "Calendar not connected",
                  e?.message ?? "You can connect it later.",
                );
              } finally {
                setLoading(false);
              }
            })();
          },
        },
      ],
    );
  }, [
    isFocused,
    loading,
    signedIn,
    calendarConnected,
    refreshState,
    loadEvents,
  ]);

  const onSignInPress = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      await refreshState();
    } catch (e: any) {
      Alert.alert(
        "Google Sign-In failed",
        e?.message ?? "Sign-in was cancelled or failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await refreshState();
      const connected = await isGoogleCalendarConnected();
      if (connected) await loadEvents();
    } finally {
      setRefreshing(false);
    }
  };

  // For highlighting days with events
  const eventDaySet = useMemo(() => {
    const s = new Set<string>();
    for (const ev of events) {
      const d = parseISO(ev.startISO);
      if (d) s.add(dateKeyFromDate(d));
    }
    return s;
  }, [events]);

  // Build real month grid: 7 columns, with leading blanks
  const monthGrid = useMemo(() => {
    const first = startOfMonth(monthCursor);
    const leadingBlanks = first.getDay(); // 0=Sun
    const count = daysInMonth(monthCursor);

    const cells: ({ type: "blank" } | { type: "day"; date: Date })[] = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push({ type: "blank" });

    for (let day = 1; day <= count; day++) {
      cells.push({
        type: "day",
        date: new Date(first.getFullYear(), first.getMonth(), day),
      });
    }

    return cells;
  }, [monthCursor]);

  const todayKey = useMemo(() => dateKeyFromDate(new Date()), []);

  // Group events for upcoming list
  const grouped = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const k = dateKey(ev.startISO);
      const arr = m.get(k) ?? [];
      arr.push(ev);
      m.set(k, arr);
    }
    const keys = Array.from(m.keys()).sort((a, b) => a.localeCompare(b));
    return keys.map((k) => ({
      key: k,
      items: (m.get(k) ?? []).sort((a, b) => {
        const da = parseISO(a.startISO)?.getTime() ?? 0;
        const db = parseISO(b.startISO)?.getTime() ?? 0;
        return da - db;
      }),
    }));
  }, [events]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

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
              await refreshState();
              await loadEvents();
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
      <View style={styles.calendarCard}>
        <View style={styles.calendarCardTop}>
          <Text style={styles.calendarName}>Active Calendar</Text>
          <Text style={styles.collapseIcon}>—</Text>
        </View>

        {/* Month header with prev/next */}
        <View style={styles.monthHeaderRow}>
          <Pressable
            style={styles.monthNavBtn}
            onPress={() =>
              setMonthCursor(
                (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
              )
            }
          >
            <Text style={styles.monthNavText}>‹</Text>
          </Pressable>

          <Text style={styles.monthTitle}>{monthTitle(monthCursor)}</Text>

          <Pressable
            style={styles.monthNavBtn}
            onPress={() =>
              setMonthCursor(
                (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
              )
            }
          >
            <Text style={styles.monthNavText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.weekHeaderRow}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <Text key={d} style={styles.weekHeaderText}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {monthGrid.map((cell, idx) => {
            if (cell.type === "blank") {
              return <View key={`b-${idx}`} style={styles.dayBlank} />;
            }

            const k = dateKeyFromDate(cell.date);
            const isToday = k === todayKey;
            const hasEvent = eventDaySet.has(k);

            return (
              <View key={k} style={styles.dayCellWrap}>
                <View style={[styles.dayPill, isToday && styles.dayPillToday]}>
                  <Text
                    style={[styles.dayCellText, isToday && styles.dayTextToday]}
                  >
                    {cell.date.getDate()}
                  </Text>
                </View>

                {/* tiny dot if there’s an event that day */}
                {hasEvent ? (
                  <View style={styles.eventDot} />
                ) : (
                  <View style={styles.eventDotSpacer} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.upcomingTitle}>Upcoming Events</Text>

      {eventsLoading ? (
        <ActivityIndicator />
      ) : eventsError ? (
        <Text style={styles.emptyText}>{eventsError}</Text>
      ) : events.length === 0 ? (
        <Text style={styles.emptyText}>
          No upcoming events were found in your calendar.
        </Text>
      ) : (
        grouped.map((group) => {
          const first = parseISO(group.items[0]?.startISO);
          const header = first ? formatDayHeader(first) : "Upcoming";

          return (
            <View key={group.key} style={styles.eventsCard}>
              <Text style={styles.eventsCardHeader}>{header}</Text>

              {group.items.map((e) => {
                const time = formatTimeRange(e.startISO, e.endISO);
                const title = `${e.summary ?? "Untitled"}${
                  e.location ? ` - ${e.location}` : ""
                }`;

                return (
                  <View key={e.id} style={styles.eventRow}>
                    <View style={styles.eventTextBlock}>
                      <Text style={styles.eventTime}>{time}</Text>
                      <View style={styles.purpleLine} />
                      <Text style={styles.eventTitle}>{title}</Text>
                    </View>

                    <Pressable
                      style={styles.directionsBtn}
                      onPress={() => {
                        Alert.alert(
                          "Directions",
                          "Next step: connect this to your directions feature.",
                        );
                      }}
                    >
                      <Text style={styles.directionsIcon}>↗</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 20,
  },
  googleBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    marginBottom: 12,
  },
  googleBtnText: { fontSize: 16, fontWeight: "600" },
  redBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: "#D94444",
    alignItems: "center",
  },
  redBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  page: { flex: 1, backgroundColor: "#fff" },
  pageContent: { padding: 18, paddingBottom: 40 },

  calendarCard: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#d0d0d0",
    overflow: "hidden",
    marginTop: 10,
  },
  calendarCardTop: {
    backgroundColor: "#7c1f32",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarName: { color: "#fff", fontSize: 16, fontWeight: "700" },
  collapseIcon: { color: "#fff", fontSize: 22, fontWeight: "700" },

  monthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  monthNavBtn: {
    width: 40,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavText: { fontSize: 22, fontWeight: "700", color: "#333" },
  monthTitle: { fontSize: 18, fontWeight: "700", color: "#111" },

  weekHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  weekHeaderText: { width: "14.28%", textAlign: "center", color: "#666" },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  dayBlank: { width: "14.28%", height: 44 },
  dayCellWrap: {
    width: "14.28%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillToday: {
    borderWidth: 2,
    borderColor: "#7c1f32",
  },
  dayCellText: { color: "#222", fontWeight: "600" },
  dayTextToday: { color: "#7c1f32" },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d100ff",
    marginTop: 4,
  },
  eventDotSpacer: { width: 6, height: 6, marginTop: 4 },

  upcomingTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 26,
    marginBottom: 12,
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 10,
  },

  eventsCard: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#d0d0d0",
    padding: 14,
    marginTop: 10,
  },
  eventsCardHeader: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  eventTextBlock: { flex: 1 },
  eventTime: { fontSize: 14, color: "#333" },
  purpleLine: {
    height: 2,
    backgroundColor: "#d100ff",
    marginVertical: 6,
    borderRadius: 2,
  },
  eventTitle: { fontSize: 14, color: "#333" },

  directionsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1da1f2",
    alignItems: "center",
    justifyContent: "center",
  },
  directionsIcon: { color: "#fff", fontSize: 18, fontWeight: "800" },
});
