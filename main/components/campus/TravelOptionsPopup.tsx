import React, { useCallback, useMemo, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  Image,
  View,
  useWindowDimensions,
} from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetHandleProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import type { RouteChip } from "./helper_methods/routeStrategy";

import type {
  DirectionRoute,
  TravelMode,
} from "@/components/campus/helper_methods/googleDirections";
import type {
  ShuttleInfo,
  ShuttleStatus,
} from "@/components/campus/helper_methods/shuttleSchedule";
import { RouteStrategyFactory } from "./helper_methods/RouteStrategyFactory";
import { bottomSheetStyle } from "../Styles/bottomSheetStyle";

const ICON_SUBWAY = require("../../assets/icons/icon-subway.png");
const ICON_BUS = require("../../assets/icons/icon-bus.png");

type ModeData = {
  mode: TravelMode;
  routes: DirectionRoute[];
};

type Props = {
  campusTheme: "SGW" | "LOY";
  visible: boolean;
  modes: ModeData[];
  selectedMode: TravelMode;
  selectedRouteIndex: number;
  onSelectMode: (mode: TravelMode) => void;
  onSelectRouteIndex: (index: number) => void;
  onClose: () => void;
  onGo: (mode: TravelMode, index: number) => void;
  onSheetChange?: (index: number) => void;
  shuttleInfo?: ShuttleInfo;
};

type LineChipProps = {
  label: string;
  iconSource: any;
  backgroundColor: string;
  textColor: string;
};

type ShuttleCardProps = {
  shuttleInfo?: ShuttleInfo;
  onGo: (mode: TravelMode, index: number) => void;
};

type RouteListProps = {
  routes: DirectionRoute[];
  selectedMode: TravelMode;
  selectedRouteIndex: number;
  onSelectRouteIndex: (index: number) => void;
  onGo: (mode: TravelMode, index: number) => void;
};

function getBusDetails(lines: RouteChip[] | undefined): string[] {
  const set = new Set<string>();

  for (const line of lines ?? []) {
    if (line.kind?.toLowerCase() === "bus" && line.label) {
      set.add(line.label);
    }
  }

  return [...set];
}

function getMetroDetails(lines: RouteChip[] | undefined): string[] {
  const set = new Set<string>();

  for (const line of lines ?? []) {
    if (
      (line.kind?.toLowerCase() === "subway" ||
        line.kind?.toLowerCase() === "metro") &&
      line.label
    ) {
      set.add(line.label);
    }
  }

  return [...set];
}

function formatDuration(text?: string): string {
  if (!text) return "--";

  return text
    .replaceAll(/hours?/gi, "h")
    .replaceAll(/mins?/gi, "m")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function iconForMode(mode: TravelMode) {
  switch (mode) {
    case "driving":
      return "directions-car";
    case "walking":
      return "directions-walk";
    case "transit":
      return "directions-transit";
    case "bicycling":
      return "directions-bike";
    case "shuttle":
      return "directions-bus";
  }
}

function shuttleStatusLabel(status: ShuttleStatus): string {
  switch (status) {
    case "operating":
      return "Shuttle in service";
    case "no-service-today":
      return "No service today";
    case "last-bus-departed":
      return "No upcoming shuttles today";
  }
}

function shuttleFromTo(direction: ShuttleInfo["direction"]): {
  from: string;
  to: string;
} {
  return direction === "SGW_TO_LOY"
    ? { from: "SGW", to: "Loyola" }
    : { from: "Loyola", to: "SGW" };
}

function metroLineColor(name: string): string {
  const normalizedName = name.trim().toLowerCase();

  if (normalizedName.includes("1")) return "#2E7D32";
  if (normalizedName.includes("2")) return "#EF6C00";
  if (normalizedName.includes("4")) return "#F9A825";
  if (normalizedName.includes("5")) return "#1565C0";

  return "rgba(139, 32, 52, 0.27)";
}

function metroTextColor(backgroundColor: string): "#111" | "#fff" {
  return backgroundColor === "#F9A825" ? "#111" : "#fff";
}

function getModeChipLabel(
  mode: TravelMode,
  fastest: DirectionRoute | undefined,
  shuttleInfo?: ShuttleInfo,
): string {
  if (mode !== "shuttle") {
    return formatDuration(fastest?.durationText);
  }

  if (
    shuttleInfo?.status === "operating" &&
    shuttleInfo.nextDepartures.length > 0
  ) {
    return shuttleInfo.nextDepartures[0];
  }

  if (shuttleInfo) {
    return "No service";
  }

  return "--";
}

function LineChip({
  label,
  iconSource,
  backgroundColor,
  textColor,
}: Readonly<LineChipProps>) {
  return (
    <View style={[s.lineChip, { backgroundColor }]}>
      <Image
        source={iconSource}
        style={[s.chipIcon, { tintColor: textColor }]}
        resizeMode="contain"
      />
      <Text style={[s.lineChipText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function ShuttleUnavailableContent() {
  return (
    <>
      <Text style={s.shuttleStatusText}>Shuttle schedule unavailable</Text>
      <Text style={[s.routeMeta, { marginTop: 6 }]}>
        Couldn&apos;t read schedule data. Please try again later.
      </Text>
    </>
  );
}

function ShuttleOperatingContent({
  shuttleInfo,
}: Readonly<{ shuttleInfo: ShuttleInfo }>) {
  const { from, to } = shuttleFromTo(shuttleInfo.direction);
  const nextDeparture = shuttleInfo.nextDepartures[0];

  return (
    <>
      <Text style={s.shuttleStatusText}>
        {shuttleStatusLabel(shuttleInfo.status)}
      </Text>

      <Text style={[s.routeMeta, { marginTop: 8 }]}>Next departures</Text>
      <Text style={s.shuttleDepartures} testID="shuttle-departures">
        {shuttleInfo.nextDepartures.join("  ·  ")}
      </Text>

      <View style={s.shuttleLegs}>
        <View style={s.shuttleLeg}>
          <MaterialIcons
            name="directions-walk"
            size={16}
            color="rgba(17,17,17,0.55)"
          />
          <Text style={s.shuttleLegText}>
            Walk to {from} shuttle stop
            {nextDeparture ? ` · departs ${nextDeparture}` : ""}
          </Text>
        </View>

        <View style={s.shuttleLegConnector} />

        <View style={s.shuttleLeg}>
          <MaterialIcons
            name="directions-bus"
            size={16}
            color="rgba(17,17,17,0.55)"
          />
          <Text style={s.shuttleLegText}>
            Concordia Shuttle — {from} → {to} · ~30 min · ~8 km
          </Text>
        </View>

        <View style={s.shuttleLegConnector} />

        <View style={s.shuttleLeg}>
          <MaterialIcons
            name="directions-walk"
            size={16}
            color="rgba(17,17,17,0.55)"
          />
          <Text style={s.shuttleLegText}>
            Walk to destination at {to} campus
          </Text>
        </View>
      </View>
    </>
  );
}

function ShuttleInactiveContent({
  shuttleInfo,
}: Readonly<{ shuttleInfo: ShuttleInfo }>) {
  const message =
    shuttleInfo.status === "no-service-today"
      ? "Service runs Monday – Friday."
      : "No more shuttles today. Check back tomorrow.";

  return (
    <>
      <Text style={s.shuttleStatusText}>
        {shuttleStatusLabel(shuttleInfo.status)}
      </Text>
      <Text style={[s.routeMeta, { marginTop: 6 }]}>{message}</Text>
    </>
  );
}

function ShuttleContent({
  shuttleInfo,
}: Readonly<{ shuttleInfo?: ShuttleInfo }>) {
  if (shuttleInfo === undefined) {
    return <ShuttleUnavailableContent />;
  }

  if (shuttleInfo.status === "operating") {
    return <ShuttleOperatingContent shuttleInfo={shuttleInfo} />;
  }

  return <ShuttleInactiveContent shuttleInfo={shuttleInfo} />;
}

function ShuttleCard({ shuttleInfo, onGo }: Readonly<ShuttleCardProps>) {
  const isOperating = shuttleInfo?.status === "operating";

  return (
    <View style={s.routeCard} testID="route-shuttle-card">
      <View style={{ flex: 1 }}>
        <ShuttleContent shuttleInfo={shuttleInfo} />
      </View>

      <Pressable
        onPress={(e: any) => {
          e?.stopPropagation?.();
          onGo("shuttle", 0);
        }}
        style={[s.goBtn, !isOperating && s.goBtnDisabled]}
        disabled={!isOperating}
        testID="go-shuttle-0"
      >
        <Text style={s.goText}>GO</Text>
      </Pressable>
    </View>
  );
}

function RouteList({
  routes,
  selectedMode,
  selectedRouteIndex,
  onSelectRouteIndex,
  onGo,
}: Readonly<RouteListProps>) {
  return (
    <>
      {routes.map((route, index) => {
        const isActive = index === selectedRouteIndex;
        const strategy =
          selectedMode === "shuttle"
            ? null
            : RouteStrategyFactory.create(selectedMode);
        const chipLines = strategy?.getChips(route) ?? [];

        const buses = getBusDetails(chipLines);
        const metros = getMetroDetails(chipLines);

        return (
          <Pressable
            key={`${selectedMode}-${index}`}
            onPress={() => onSelectRouteIndex(index)}
            style={[s.routeCard, isActive && s.routeCardActive]}
            testID={`route-${selectedMode}-${index}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.routeBig}>{route.durationText}</Text>
              <Text style={s.routeMeta}>{route.distanceText}</Text>
              {!!route.summary && (
                <Text style={s.routeSummary}>{route.summary}</Text>
              )}

              {chipLines.length > 0 && (
                <View style={s.transitRow}>
                  {buses.slice(0, 4).map((bus) => (
                    <LineChip
                      key={`bus-${bus}`}
                      label={bus}
                      iconSource={ICON_BUS}
                      backgroundColor="rgba(0, 98, 255, 0.12)"
                      textColor="#111"
                    />
                  ))}

                  {buses.length > 4 && (
                    <Text style={s.moreText}>+{buses.length - 4}</Text>
                  )}

                  {metros.slice(0, 2).map((metro) => {
                    const backgroundColor = metroLineColor(metro);
                    const textColor = metroTextColor(backgroundColor);

                    return (
                      <LineChip
                        key={`metro-${metro}`}
                        label={metro}
                        iconSource={ICON_SUBWAY}
                        backgroundColor={backgroundColor}
                        textColor={textColor}
                      />
                    );
                  })}
                </View>
              )}
            </View>

            <Pressable
              onPress={(e: any) => {
                e?.stopPropagation?.();
                onGo(selectedMode, index);
              }}
              style={s.goBtn}
              testID={`go-${selectedMode}-${index}`}
            >
              <Text style={s.goText}>GO</Text>
            </Pressable>
          </Pressable>
        );
      })}
    </>
  );
}

export default function TravelOptionsPopup({
  campusTheme,
  visible,
  modes,
  selectedMode,
  selectedRouteIndex,
  onSelectMode,
  onSelectRouteIndex,
  onClose,
  onGo,
  onSheetChange,
  shuttleInfo,
}: Readonly<Props>) {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const theme =
    campusTheme === "SGW"
      ? {
          brand: "#912338",
          border: "rgba(145,35,56,0.25)",
          closeBg: "rgba(145,35,56,0.14)",
        }
      : {
          brand: "#E0B100",
          border: "rgba(224,177,0,0.25)",
          closeBg: "rgba(224,177,0,0.18)",
        };

  const snapPoints = useMemo(() => {
    const collapsed = Math.max(260, Math.round(windowHeight * 0.28));
    const topBuffer = insets.top - 6;
    const expanded = Math.max(300, windowHeight - topBuffer);
    return [collapsed, expanded];
  }, [windowHeight, insets.top]);

  const expandSheet = useCallback(() => {
    sheetRef.current?.snapToIndex(1);
  }, []);

  const closeSheet = useCallback(() => {
    sheetRef.current?.close();
    onClose();
  }, [onClose]);

  const Handle = useCallback(
    (_props: BottomSheetHandleProps) => (
      <View style={s.handleWrap}>
        <Pressable
          onPress={expandSheet}
          style={s.handleTapArea}
          testID="travelPopup-handle"
        >
          <View style={s.handleIndicator} />
        </Pressable>

        <Pressable
          onPress={closeSheet}
          hitSlop={14}
          style={[s.handleCloseBtn, { backgroundColor: theme.closeBg }]}
          testID="travelPopup-close"
          accessibilityRole="button"
          accessibilityLabel="Close directions popup"
        >
          <Text style={[s.handleCloseText, { color: theme.brand }]}>✕</Text>
        </Pressable>
      </View>
    ),
    [expandSheet, closeSheet, theme.brand, theme.closeBg],
  );

  const selectedModeData = modes.find(
    (modeData) => modeData.mode === selectedMode,
  );
  const routes = selectedModeData?.routes ?? [];

  if (visible === false) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      onChange={(index) => onSheetChange?.(index)}
      handleComponent={Handle}
      topInset={Math.max(0, insets.top - 6)}
      backgroundStyle={[s.sheetBackground, { borderColor: theme.border }]}
    >
      <View style={s.header}>
        <Text style={s.headerTitle}>Directions</Text>
      </View>

      <View style={s.modeBar}>
        {modes.map((modeData) => {
          const fastest = modeData.routes[0];
          const isActive = modeData.mode === selectedMode;
          const chipLabel = getModeChipLabel(
            modeData.mode,
            fastest,
            shuttleInfo,
          );

          return (
            <Pressable
              key={modeData.mode}
              onPress={() => onSelectMode(modeData.mode)}
              style={[s.modeChip, isActive && s.modeChipActive]}
              testID={`mode-${modeData.mode}`}
            >
              <MaterialIcons
                name={iconForMode(modeData.mode) as any}
                size={18}
                color={isActive ? "#111" : "rgba(17,17,17,0.55)"}
              />
              <Text
                style={[s.modeChipTime, isActive && s.modeChipTimeActive]}
                numberOfLines={1}
                testID={`mode-${modeData.mode}-time`}
                ellipsizeMode="tail"
              >
                {chipLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <BottomSheetScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {selectedMode === "shuttle" ? (
          <ShuttleCard shuttleInfo={shuttleInfo} onGo={onGo} />
        ) : (
          <RouteList
            routes={routes}
            selectedMode={selectedMode}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRouteIndex={onSelectRouteIndex}
            onGo={onGo}
          />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  transitRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  busChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgb(0, 98, 255)",
  },

  busChipText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111",
  },

  metroChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(145,35,56,0.12)",
  },

  metroChipText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#111",
  },

  chipIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
  },

  lineChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  lineChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  moreText: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,17,17,0.55)",
  },

  sheetBackground: {
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.98)",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 10,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },

  headerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerCloseText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
  },
  ...bottomSheetStyle,
  modeBar: {
    marginHorizontal: 16,
    marginBottom: 6,
    padding: 6,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.06)",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  modeChip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  modeChipActive: {
    backgroundColor: "white",
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  modeChipTime: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,17,17,0.55)",
    maxWidth: 60,
  },

  modeChipTimeActive: {
    color: "#111",
  },

  modeRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },

  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(17,17,17,0.05)",
  },

  modePillActive: {
    backgroundColor: "rgba(17,17,17,0.10)",
  },

  modeTime: {
    fontSize: 13,
    color: "#111",
    fontWeight: "700",
  },

  content: {
    padding: 14,
    gap: 10,
    paddingBottom: 30,
  },

  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(17,17,17,0.05)",
  },

  routeCardActive: {
    backgroundColor: "rgba(17,17,17,0.08)",
  },

  routeBig: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
  },

  routeMeta: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,17,17,0.55)",
  },

  routeSummary: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,17,17,0.55)",
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(17,17,17,0.05)",
  },

  routeRowActive: {
    backgroundColor: "rgba(11,87,208,0.10)",
  },

  routeTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },

  routeSub: {
    fontSize: 12,
    color: "rgba(17,17,17,0.55)",
    marginTop: 2,
  },

  goBtn: {
    marginLeft: 12,
    backgroundColor: "#22C55E",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },

  goBtnDisabled: {
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  goText: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
  },

  shuttleStatusText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },

  shuttleDepartures: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: "#111",
    letterSpacing: 0.3,
  },

  shuttleLegs: {
    marginTop: 12,
    gap: 2,
  },

  shuttleLeg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  shuttleLegText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(17,17,17,0.7)",
    flex: 1,
  },

  shuttleLegConnector: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(17,17,17,0.2)",
    marginLeft: 7,
    marginVertical: 1,
  },
});
