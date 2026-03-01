import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import {
  fetchNextClassEvent,
  fetchNextClassEventToday,
  CalendarEvent,
  NextClassError,
} from "@/services/googleCalendar";

type Props = {
  calendarId?: string;
};

export default function FindNextClass({ calendarId }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [event, setEvent] = useState<CalendarEvent | null>(null);

  const handleFindNextClass = async () => {
    setMessage("");
    setEvent(null);

    if (!calendarId) {
      setMessage("Please select your class calendar first.");
      return;
    }

    setLoading(true);

    try {
      // 1) Try to find a class still happening today
      const todayNext = await fetchNextClassEventToday(calendarId);

      if (todayNext) {
        setEvent(todayNext);
        return;
      }

      // 2) If none left today, find the next class (could be tomorrow/next week)
      const next = await fetchNextClassEvent(calendarId);

      if (!next) {
        setMessage("No upcoming classes found.");
      } else {
        setMessage("No more classes scheduled for today. Next class:");
        setEvent(next);
      }
    } catch (error: any) {
      if (error instanceof NextClassError) {
        if (error.code === "NOT_CONNECTED") {
          setMessage(
            "Google Calendar isn’t connected. Please connect it and try again.",
          );
          return;
        }

        if (error.code === "WRONG_CALENDAR") {
          setMessage(
            "Selected calendar cannot be accessed. Please choose the correct calendar.",
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
    <View style={{ marginTop: 12, marginBottom: 8 }}>
      <Pressable
        onPress={handleFindNextClass}
        disabled={loading}
        style={{
          backgroundColor: "#7A1F2B",
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: "center",
          marginHorizontal: 16,
          opacity: loading ? 0.85 : 1,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
          {loading ? "Finding…" : "Find my Next Class"}
        </Text>
      </Pressable>

      {loading && (
        <View style={{ marginTop: 10 }}>
          <ActivityIndicator />
        </View>
      )}

      {!!message && (
        <Text style={{ marginTop: 10, marginHorizontal: 16, color: "#B00020" }}>
          {message}
        </Text>
      )}

      {event && (
        <View
          style={{
            marginTop: 10,
            marginHorizontal: 16,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#ddd",
            backgroundColor: "white",
          }}
        >
          <Text style={{ fontWeight: "800", fontSize: 16 }}>
            {event.summary ?? "Next class"}
          </Text>

          {!!event.startISO && (
            <Text style={{ marginTop: 6 }}>
              Starts: {new Date(event.startISO).toLocaleString()}
            </Text>
          )}

          {!!event.location && (
            <Text style={{ marginTop: 4 }}>Location: {event.location}</Text>
          )}
        </View>
      )}
    </View>
  );
}