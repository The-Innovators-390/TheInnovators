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
  Modal,
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

  const activeCalendarName =
    calendars.find((c) => c.id === activeCalendarId)?.summary ?? "Primary";

  const pendingCalendarName =
    calendars.find((c) => c.id === pendingCalendarId)?.summary ?? "Primary";

  // prevents the alert from popping multiple times on re-render
  const promptedRef = useRef(false);

  const goToMap = () => router.replace("/(tabs)/map");

  const refreshState = useCallback(async () => {
    const user = await GoogleSignin.getCurrentUser();
    setSignedIn(!!user);

    const connected = await isGoogleCalendarConnected();
    setCalendarConnected(connected);
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
  }, [activeCalendarId]);

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
    await refreshState();
    const connected = await isGoogleCalendarConnected();
    if (connected) {
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

  const onRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await runFetchCycle();
  } finally {
    setRefreshing(false);
  }
}, [runFetchCycle]);

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

    const cells: Array<{ type: "blank" } | { type: "day"; date: Date }> = [];
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
    const keys = Array.from(m.keys()).sort();
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
      <Text style={styles.otherTitle}>Other Calendars</Text>

{calendarsLoading ? (
  <ActivityIndicator />
) : calendarsError ? (
  <Text style={styles.emptyText}>{calendarsError}</Text>
) : calendars.length === 0 ? (
  <Text style={styles.emptyText}>No other calendars found.</Text>
) : (
  <>
    <Pressable
      style={styles.dropdown}
      onPress={() => setPickerOpen(true)}
    >
      <Text style={styles.dropdownText}>{pendingCalendarName}</Text>
      <Text style={styles.dropdownChevron}>⌄</Text>
    </Pressable>

    <Pressable
      style={[
        styles.selectCalendarBtn,
        pendingCalendarId === activeCalendarId && styles.selectCalendarBtnDisabled,
      ]}
      disabled={pendingCalendarId === activeCalendarId}
      onPress={async () => {
        setActiveCalendarId(pendingCalendarId);
        await loadEvents(pendingCalendarId);
      }}
    >
      <Text style={styles.selectCalendarBtnText}>Select this calendar</Text>
    </Pressable>

    <Modal
      visible={pickerOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setPickerOpen(false)}
    >
      <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Choose a calendar</Text>

          <ScrollView style={{ maxHeight: 320 }}>
            {calendars.map((c) => {
              const selected = c.id === pendingCalendarId;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.modalItem, selected && styles.modalItemSelected]}
                  onPress={() => {
                    setPendingCalendarId(c.id);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {c.summary} {c.primary ? "(Primary)" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  </>
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
  otherTitle: {
  fontSize: 22,         
  fontWeight: "800",
  marginTop: 18,
  marginBottom: 10,
},

dropdown: {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderWidth: 2,
  borderColor: "#d0d0d0",
  borderRadius: 18,
  paddingHorizontal: 14,
  paddingVertical: 12,
  backgroundColor: "#fff",
},

dropdownText: {
  fontSize: 15,
  fontWeight: "700",
  color: "#333",
},

dropdownChevron: {
  fontSize: 18,
  fontWeight: "900",
  color: "#666",
},

selectCalendarBtn: {
  width: "100%",
  marginTop: 12,
  paddingVertical: 14,
  borderRadius: 28,      
  backgroundColor: "#5BCB63",
  alignItems: "center",
},

selectCalendarBtnDisabled: {
  opacity: 0.55,
},

selectCalendarBtnText: {
  color: "#000",
  fontSize: 16,
  fontWeight: "700",
},

modalBackdrop: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.35)",
  justifyContent: "center",
  padding: 18,           
},

modalCard: {
  backgroundColor: "#fff",
  borderRadius: 18,
  borderWidth: 2,
  borderColor: "#d0d0d0",
  padding: 14,
},

modalTitle: {
  fontSize: 16,
  fontWeight: "800",
  color: "#111",
  marginBottom: 10,
},

modalItem: {
  paddingVertical: 12,
  paddingHorizontal: 10,
  borderRadius: 14,
},

modalItemSelected: {
  backgroundColor: "rgba(91,203,99,0.18)",
},

modalItemText: {
  fontSize: 14,
  fontWeight: "700",
  color: "#333",
},
});
