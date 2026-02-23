import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { Building } from "@/components/Buildings/types";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  start: Building | null;
  destination: Building | null;
  activeField: "start" | "destination";
  onFocusField: (f: "start" | "destination") => void;
  onSwap: () => void;
  startText: string;
  destText: string;
  onChangeStartText: (t: string) => void;
  onChangeDestText: (t: string) => void;
  disabled?: boolean;
  onClearStart: () => void;
  onClearDestination: () => void;
  /** T-12.1: tap to detect GPS and fill the start field */
  onUseMyLocation?: () => void;
};

export default function RouteInput({
  start,
  destination,
  activeField,
  onFocusField,
  onSwap,
  startText,
  destText,
  onChangeStartText,
  onChangeDestText,
  disabled,
  onClearStart,
  onClearDestination,
  onUseMyLocation,
}: Readonly<Props>) {
  // If a building is selected, show its label; otherwise show whatever user typed.
  let startValue = startText;

  if (start) {
    if (start.id === "USER_LOCATION") startValue = "Your Location";
    else startValue = `${start.code} - ${start.name}`;
  }
  const destValue = destination
    ? `${destination.code} - ${destination.name}`
    : destText;

  return (
    <View style={s.card} testID="routeCard">
      {/* Left icon rail */}
      <View style={s.rail} pointerEvents="none">
        <MaterialIcons name="radio-button-checked" size={14} color="#111" />
        <View style={s.dots} />
        <MaterialIcons name="place" size={16} color="#D32F2F" />
      </View>

      {/* Inputs */}
      <View style={s.inputs}>
        <Pressable
          onPress={() => onFocusField("start")}
          style={[s.inputRow, activeField === "start" && s.inputRowActive]}
          testID="routeStartRow"
        >
          <View style={s.inputWrapper}>
            <TextInput
              testID="routeStartInput"
              value={startValue}
              onChangeText={onChangeStartText}
              placeholder="Enter your starting location"
              placeholderTextColor="rgba(17,17,17,0.45)"
              style={s.input}
              editable={!disabled}
              onFocus={() => onFocusField("start")}
              autoCorrect={false}
              autoCapitalize="none"
            />

            {startValue.length > 0 ? (
              <Pressable
                onPress={(e?: any) => {
                  e?.stopPropagation?.();
                  onClearStart();
                }}
                hitSlop={8}
                style={s.clearButton}
                testID="clearStart"
              >
                <Text style={s.clearIcon}>✕</Text>
              </Pressable>
            ) : (
              onUseMyLocation && (
                <Pressable
                  onPress={(e?: any) => {
                    e?.stopPropagation?.();
                    onUseMyLocation();
                  }}
                  hitSlop={8}
                  style={s.clearButton}
                  testID="useMyLocation"
                >
                  <MaterialIcons
                    name="my-location"
                    size={16}
                    color="rgba(17,17,17,0.55)"
                  />
                </Pressable>
              )
            )}
          </View>
        </Pressable>

        <View style={s.divider} />

        <Pressable
          onPress={() => onFocusField("destination")}
          style={[
            s.inputRow,
            activeField === "destination" && s.inputRowActive,
          ]}
          testID="routeDestRow"
        >
          <View style={s.inputWrapper}>
            <TextInput
              testID="routeDestInput"
              value={destValue}
              onChangeText={onChangeDestText}
              placeholder="Enter your destination"
              placeholderTextColor="rgba(17,17,17,0.45)"
              style={s.input}
              editable={!disabled}
              onFocus={() => onFocusField("destination")}
              autoCorrect={false}
              autoCapitalize="none"
            />

            {destValue.length > 0 && (
              <Pressable
                onPress={(e?: any) => {
                  e?.stopPropagation?.();
                  onClearDestination();
                }}
                hitSlop={8}
                style={s.clearButton}
                testID="clearDestination"
              >
                <Text style={s.clearIcon}>✕</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </View>

      {/* Swap button */}
      <Pressable
        testID="routeSwapButton"
        onPress={onSwap}
        style={s.swapBtn}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Swap start and destination"
      >
        <Text style={s.swapText}>⇅</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },

  rail: {
    width: 18,
    alignItems: "center",
    marginRight: 10,
  },
  dots: {
    width: 2,
    height: 22,
    marginVertical: 6,
    borderRadius: 1,
    backgroundColor: "rgba(17,17,17,0.25)",
  },
  inputs: {
    flex: 1,
  },
  inputRow: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "rgba(17,17,17,0.04)",
  },
  inputRowActive: {
    backgroundColor: "rgba(17,17,17,0.07)",
  },
  input: {
    fontSize: 15,
    color: "#111",
    padding: 0,
  },
  divider: {
    height: 8,
  },

  swapBtn: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  swapText: {
    fontSize: 18,
    color: "#111",
    fontWeight: "800",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },

  clearButton: {
    marginLeft: "auto",
  },

  clearIcon: {
    fontSize: 14,
    color: "rgba(17,17,17,0.55)",
    fontWeight: "600",
  },
});
