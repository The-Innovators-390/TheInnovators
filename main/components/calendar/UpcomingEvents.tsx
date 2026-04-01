import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { CalendarEvent } from "@/services/googleCalendar";
import {
  parseISO,
  formatDayHeader,
  formatTimeRange,
} from "@/services/calendarUtils";

type GroupedEvents = { key: string; items: CalendarEvent[] }[];

type Props = {
  eventsLoading: boolean;
  eventsError: string | null;
  events: CalendarEvent[];
  grouped: { key: string; items: CalendarEvent[] }[];
  styles: any;
  onPressDirections: (event: CalendarEvent) => void;
};

function EventRow({
  event,
  styles,
  onPressDirections,
}: Readonly<{
  event: CalendarEvent;
  styles: any;
  onPressDirections: (event: CalendarEvent) => void;
}>) {
  const time = formatTimeRange(event.startISO, event.endISO);
  const title = `${event.summary ?? "Untitled"}${
    event.location ? ` - ${event.location}` : ""
  }`;
  const hasLocation = !!event.location?.trim();

  return (
    <View key={event.id} style={styles.eventRow}>
      <View style={styles.eventTextBlock}>
        <Text style={styles.eventTime}>{time}</Text>
        <View style={styles.purpleLine} />
        <Text style={styles.eventTitle}>{title}</Text>
      </View>

      {hasLocation && (
        <Pressable
          style={styles.directionsBtn}
          onPress={() => onPressDirections(event)}
        >
          <Text style={styles.directionsIcon}>Get Directions</Text>
        </Pressable>
      )}
    </View>
  );
}

function EventGroup({
  group,
  styles,
  onPressDirections,
}: Readonly<{
  group: { key: string; items: CalendarEvent[] };
  styles: any;
  onPressDirections: (event: CalendarEvent) => void;
}>) {
  const first = parseISO(group.items[0]?.startISO);
  const header = first ? formatDayHeader(first) : "Upcoming";

  return (
    <View key={group.key} style={styles.eventsCard}>
      <Text style={styles.eventsCardHeader}>{header}</Text>

      {group.items.map((event) => (
        <EventRow
          key={event.id}
          event={event}
          styles={styles}
          onPressDirections={onPressDirections}
        />
      ))}
    </View>
  );
}

function renderContent({
  eventsLoading,
  eventsError,
  hasNoEvents,
  grouped,
  styles,
  onPressDirections,
}: {
  eventsLoading: boolean;
  eventsError: string | null;
  hasNoEvents: boolean;
  grouped: GroupedEvents;
  styles: any;
  onPressDirections: (event: CalendarEvent) => void;
}) {
  if (eventsLoading) return <ActivityIndicator />;

  if (eventsError) {
    return <Text style={styles.emptyText}>{eventsError}</Text>;
  }

  if (hasNoEvents) {
    return (
      <Text style={styles.emptyText}>
        No upcoming events were found in your calendar.
      </Text>
    );
  }

  return grouped.map((group) => (
    <EventGroup
      key={group.key}
      group={group}
      styles={styles}
      onPressDirections={onPressDirections}
    />
  ));
}

export default function UpcomingEvents({
  eventsLoading,
  eventsError,
  events,
  grouped,
  styles,
  onPressDirections,
}: Readonly<Props>) {
  const hasNoEvents = events.length === 0;

  const content = useMemo(
    () =>
      renderContent({
        eventsLoading,
        eventsError,
        hasNoEvents,
        grouped,
        styles,
        onPressDirections,
      }),
    [
      eventsLoading,
      eventsError,
      hasNoEvents,
      grouped,
      styles,
      onPressDirections,
    ],
  );

  return (
    <>
      <Text style={styles.upcomingTitle}>Upcoming Events</Text>
      {content}
    </>
  );
}
