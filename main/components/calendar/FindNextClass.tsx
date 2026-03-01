import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import {
  fetchNextClassEvent,
  fetchNextClassEventToday,
  CalendarEvent,
  NextClassError,
} from "@/services/googleCalendar";

import {
  searchSGWBuildings,
  searchLoyolaBuildings,
} from "@/components/Buildings/search";

import type { Building } from "@/components/Buildings/types";

type Props = {
  calendarId?: string;
};

function extractRoom(location?: string): string | undefined {
  if (!location) return undefined;
  const match = location.match(/\bRm\s*([A-Za-z0-9.-]+)\b/i);
  return match?.[1];
}

function detectCampus(location?: string): "SGW" | "LOY" | undefined {
  if (!location) return undefined;
  const s = location.toLowerCase();

  if (s.includes("loyola")) return "LOY";
  if (s.includes("sir george") || s.includes("sgw")) return "SGW";

  return undefined;
}

function extractBuildingQuery(location?: string): string | undefined {
  if (!location) return undefined;

  const m = location.match(/campus\s*-\s*(.*?)\s*\bRm\b/i);
  const between = m?.[1]?.trim();
  if (!between) return undefined;

  const cleaned = between.replace(/\bbuilding\b/gi, "").trim();
  return cleaned || undefined;
}

function extractBuilding(location?: string): Building | undefined {
  if (!location) return undefined;

  const campus = detectCampus(location);
  const q = extractBuildingQuery(location) ?? location;

  if (campus === "LOY") return searchLoyolaBuildings(q, 1)[0];
  if (campus === "SGW") return searchSGWBuildings(q, 1)[0];

  return searchSGWBuildings(q, 1)[0] ?? searchLoyolaBuildings(q, 1)[0];
}

export default function FindNextClass({ calendarId }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [event, setEvent] = useState<CalendarEvent | null>(null);

  const building = extractBuilding(event?.location);
  const room = extractRoom(event?.location);
  const campus = building?.campus ?? detectCampus(event?.location);

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
            position: "relative",
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

          {campus && <Text style={{ marginTop: 6 }}>Campus: {campus}</Text>}

          {building && (
            <Text style={{ marginTop: 4 }}>
              Building: {building.code} — {building.name}
            </Text>
          )}

          {room && <Text style={{ marginTop: 4 }}>Room: {room}</Text>}

          {event.location?.trim() ? (
            <Text style={{ marginTop: 4 }}>Location: {event.location}</Text>
          ) : (
            <Text style={{ marginTop: 4 }}>
              Location: (no location set for this event)
            </Text>
          )}
        </View>
      )}
    </View>
  );
}