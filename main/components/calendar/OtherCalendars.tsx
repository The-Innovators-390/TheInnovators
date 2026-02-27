import React from "react";
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
}: Props) {
  return (
    <>
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
              pendingCalendarId === activeCalendarId &&
                styles.selectCalendarBtnDisabled,
            ]}
            disabled={pendingCalendarId === activeCalendarId}
            onPress={onSelectCalendar}
          >
            <Text style={styles.selectCalendarBtnText}>
              Select this calendar
            </Text>
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
      )}
    </>
  );
}
