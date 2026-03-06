import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  fetchNextClassEvent,
  fetchNextClassEventToday,
  CalendarEvent,
  NextClassError,
} from "@/services/googleCalendar";

import {
  parseLocationDetails,
  type LocationDetails,
} from "@/services/calendarUtils";

import { styles } from "@/components/calendar/calendarStyles";

type Props = {
  calendarId?: string;
  onPressDirections: (event: CalendarEvent) => void;
};

/**
 * Format ISO date to "HH:MM AM/PM" (no seconds).
 * Example: 9:05 AM
 */
function formatTimeNoSeconds(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format ISO date to a clean, readable date (optional but nice).
 * Example: Mar 3, 2026
 */
function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FindNextClass({
  calendarId,
  onPressDirections,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [locationDetails, setLocationDetails] = useState<LocationDetails>({});

  const { building, room, campus } = locationDetails;
  const hasLocation = !!event?.location?.trim();

  const handleFindNextClass = async () => {
    setMessage("");
    setEvent(null);
    setLocationDetails({});

    if (!calendarId) {
      setMessage("Please select your class calendar first.");
      return;
    }

    setLoading(true);

    try {
      const todayNext = await fetchNextClassEventToday(calendarId);

      if (todayNext) {
        setEvent(todayNext);
        setLocationDetails(parseLocationDetails(todayNext.location));
        return;
      }

      const next = await fetchNextClassEvent(calendarId);

      if (!next) {
        setMessage("No upcoming classes found.");
        return;
      }

      setMessage("No more classes scheduled for today. Next class:");
      setEvent(next);
      setLocationDetails(parseLocationDetails(next.location));
    } catch (error: unknown) {
      if (error instanceof NextClassError) {
        switch (error.code) {
          case "NOT_CONNECTED":
            setMessage(
              "Google Calendar isn’t connected. Please connect it and try again.",
            );
            return;

          case "WRONG_CALENDAR":
            setMessage(
              "Selected calendar cannot be accessed. Please choose the correct calendar.",
            );
            return;

          case "API_ERROR":
            setMessage(
              error.message ||
                "Google Calendar API error. Please try again later.",
            );
            return;
        }
      }

      setMessage("Something went wrong while fetching your next class.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container} testID="findNextClass-root">
      <Pressable
        testID="findNextClassButton"
        onPress={handleFindNextClass}
        disabled={loading}
        style={[s.findBtn, loading && s.findBtnDisabled]}
      >
        <Text style={s.findBtnText}>
          {loading ? "Finding…" : "Find my Next Class"}
        </Text>
      </Pressable>

      {loading && (
        <View style={s.loadingWrap}>
          <ActivityIndicator />
        </View>
      )}

      {!!message && (
        <Text testID="findNextClassMessage" style={s.messageText}>
          {message}
        </Text>
      )}

      {event && (
        <View testID="findNextClassCard" style={s.card}>
          <View style={s.cardHeaderRow}>
            <Text style={s.cardTitle}>{event.summary ?? "Next class"}</Text>

            {hasLocation && (
              <Pressable
                testID="findNextClassDirections"
                style={styles.directionsBtn}
                onPress={() => onPressDirections(event)}
              >
                <Text style={styles.directionsIcon}>↗</Text>
              </Pressable>
            )}
          </View>

          {!!event.startISO && (
            <Text style={s.detailLineStarts}>
              Starts: {formatTimeNoSeconds(event.startISO)} •{" "}
              {formatDateShort(event.startISO)}
            </Text>
          )}

          {campus && <Text style={s.detailLineStarts}>Campus: {campus}</Text>}

          {building && (
            <Text style={s.detailLine}>
              Building: {building.code} — {building.name}
            </Text>
          )}

          {room && <Text style={s.detailLine}>Room: {room}</Text>}

          {event.location?.trim() ? (
            <Text style={s.detailLine}>Location: {event.location}</Text>
          ) : (
            <Text style={s.detailLine}>
              Location: (no location set for this event)
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
  },

  findBtn: {
    backgroundColor: "#7A1F2B",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginHorizontal: 16,
  },

  findBtnDisabled: {
    opacity: 0.85,
  },

  findBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  loadingWrap: {
    marginTop: 10,
  },

  messageText: {
    marginTop: 10,
    marginHorizontal: 16,
    color: "#B00020",
  },

  card: {
    marginTop: 10,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "white",
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  cardTitle: {
    fontWeight: "800",
    fontSize: 16,
    flex: 1,
  },

  detailLineStarts: {
    marginTop: 6,
  },

  detailLine: {
    marginTop: 4,
  },
});
