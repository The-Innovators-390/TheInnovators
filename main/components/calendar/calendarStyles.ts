import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
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
