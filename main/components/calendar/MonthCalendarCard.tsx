import React from "react";
import { View, Text, Pressable } from "react-native";
import { monthTitle, dateKeyFromDate } from "@/services/calendarUtils";

type MonthCell = { type: "blank" } | { type: "day"; date: Date };

type Props = {
  monthCursor: Date;
  setMonthCursor: React.Dispatch<React.SetStateAction<Date>>;
  monthGrid: MonthCell[];
  todayKey: string;
  eventDaySet: Set<string>;
  styles: any;
};

export default function MonthCalendarCard({
  monthCursor,
  setMonthCursor,
  monthGrid,
  todayKey,
  eventDaySet,
  styles,
}: Props) {
  return (
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
  );
}
