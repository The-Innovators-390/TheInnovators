export const bottomSheetStyle = {
  handleWrap: {
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  handleTapArea: {
    width: "100%" as const,
    alignItems: "center" as const,
    paddingVertical: 6,
  },
  handleIndicator: {
    width: 44,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  handleCloseBtn: {
    position: "absolute" as const,
    right: 16,
    top: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  handleCloseText: {
    fontSize: 24,
    fontWeight: "900" as const,
    lineHeight: 24,
  },
};
