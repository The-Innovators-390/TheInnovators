import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type CalendarItem = { id: string; summary: string; primary?: boolean };

type Props = {
  calendarsLoading: boolean;
  calendarsError: string | null;
  calendars: CalendarItem[];

  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;

  pendingCalendarId: string;
  setPendingCalendarId: (id: string) => void;
  pendingCalendarName: string;

  activeCalendarId: string;

  onSelectCalendar: () => void | Promise<void>;

  styles: any;
};

export default function OtherCalendars({
  calendarsLoading,
  calendarsError,
  calendars,
  pickerOpen,
  setPickerOpen,
  pendingCalendarId,
  setPendingCalendarId,
  pendingCalendarName,
  activeCalendarId,
  onSelectCalendar,
  styles,
}: Readonly<Props>) {
  const hasNoCalendars = calendars.length === 0;
  const isSameCalendar = pendingCalendarId === activeCalendarId;

  const content = useMemo(() => {
    if (calendarsLoading) return <ActivityIndicator />;

    if (calendarsError) {
      return <Text style={styles.emptyText}>{calendarsError}</Text>;
    }

    if (hasNoCalendars) {
      return <Text style={styles.emptyText}>No other calendars found.</Text>;
    }

    return (
      <>
        <Pressable style={styles.dropdown} onPress={() => setPickerOpen(true)}>
          <Text style={styles.dropdownText}>{pendingCalendarName}</Text>
          <Text style={styles.dropdownChevron}>⌄</Text>
        </Pressable>

        <Pressable
          style={[
            styles.selectCalendarBtn,
            isSameCalendar && styles.selectCalendarBtnDisabled,
          ]}
          disabled={isSameCalendar}
          onPress={() => {
            void onSelectCalendar();
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
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPickerOpen(false)}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Choose a calendar</Text>

              <ScrollView style={{ maxHeight: 320 }}>
                {calendars.map((c) => {
                  const selected = c.id === pendingCalendarId;
                  return (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.modalItem,
                        selected && styles.modalItemSelected,
                      ]}
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
    );
  }, [
    calendars,
    calendarsError,
    calendarsLoading,
    hasNoCalendars,
    isSameCalendar,
    pendingCalendarId,
    pendingCalendarName,
    onSelectCalendar,
    pickerOpen,
    setPendingCalendarId,
    setPickerOpen,
    styles,
  ]);

  return (
    <>
      <Text style={styles.otherTitle}>Other Calendars</Text>
      {content}
    </>
  );
}
