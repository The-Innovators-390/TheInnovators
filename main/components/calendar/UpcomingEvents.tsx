import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { CalendarEvent } from "@/services/googleCalendar";
import {
  parseISO,
  formatDayHeader,
  formatTimeRange,
} from "@/services/calendarUtils";

type Props = {
  eventsLoading: boolean;
  eventsError: string | null;
  events: CalendarEvent[];
  grouped: { key: string; items: CalendarEvent[] }[];
  styles: any;
  onPressDirections: (event: CalendarEvent) => void;
};

export default function UpcomingEvents({
  eventsLoading,
  eventsError,
  events,
  grouped,
  styles,
  onPressDirections,
}: Props) {
  const hasNoEvents = events.length === 0;

  const content = useMemo(() => {
    if (eventsLoading)
      return <ActivityIndicator testID="eventsLoadingIndicator" />;

    if (eventsError) {
      return (
        <Text testID="eventsErrorText" style={styles.emptyText}>
          {eventsError}
        </Text>
      );
    }

    if (hasNoEvents) {
      return (
        <Text testID="noUpcomingEventsText" style={styles.emptyText}>
          No upcoming events were found in your calendar.
        </Text>
      );
    }

    return grouped.map((group) => {
      const first = parseISO(group.items[0]?.startISO);
      const header = first ? formatDayHeader(first) : "Upcoming";

      return (
        <View
          key={group.key}
          style={styles.eventsCard}
          testID={`eventsGroup-${group.key}`}
        >
          <Text
            style={styles.eventsCardHeader}
            testID={`eventsGroupHeader-${group.key}`}
          >
            {header}
          </Text>

          {group.items.map((e, index) => {
            const time = formatTimeRange(e.startISO, e.endISO);
            const title = `${e.summary ?? "Untitled"}${
              e.location ? ` - ${e.location}` : ""
            }`;

            const hasLocation = !!e.location?.trim();

            return (
              <View
                key={e.id}
                style={styles.eventRow}
                testID={`calendarEvent-${group.key}-${index}`}
              >
                <View style={styles.eventTextBlock}>
                  <Text
                    style={styles.eventTime}
                    testID={`calendarEventTime-${group.key}-${index}`}
                  >
                    {time}
                  </Text>
                  <View style={styles.purpleLine} />
                  <Text
                    style={styles.eventTitle}
                    testID={`calendarEventTitle-${group.key}-${index}`}
                  >
                    {title}
                  </Text>
                </View>

                {hasLocation && (
                  <Pressable
                    testID={`calendarEventDirections-${group.key}-${index}`}
                    style={styles.directionsBtn}
                    onPress={() => onPressDirections(e)}
                  >
                    <Text style={styles.directionsIcon}>↗</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      );
    });
  }, [
    eventsError,
    eventsLoading,
    grouped,
    hasNoEvents,
    onPressDirections,
    styles,
  ]);

  return (
    <>
      <Text testID="upcomingEventsTitle" style={styles.upcomingTitle}>
        Upcoming Events
      </Text>
      {content}
    </>
  );
}
