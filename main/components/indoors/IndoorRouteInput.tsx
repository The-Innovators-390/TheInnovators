import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { IndoorNode } from "./types";

type FieldName = "start" | "destination";

type RouteFieldRowProps = {
  field: FieldName;
  value: string;
  activeField: FieldName;
  placeholder: string;
  disabled?: boolean;
  testIDRow: string;
  testIDInput: string;
  testIDClear: string;
  onFocusField: (f: FieldName) => void;
  onChangeText: (t: string) => void;
  onClear: () => void;
};

function RouteFieldRow({
  field,
  value,
  activeField,
  placeholder,
  disabled,
  testIDRow,
  testIDInput,
  testIDClear,
  onFocusField,
  onChangeText,
  onClear,
}: Readonly<RouteFieldRowProps>) {
  return (
    <View
      style={[s.inputRow, activeField === field && s.inputRowActive]}
      testID={testIDRow}
    >
      <TextInput
        testID={testIDInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(17,17,17,0.45)"
        style={s.input}
        editable={!disabled}
        onFocus={() => onFocusField(field)}
        autoCorrect={false}
        autoCapitalize="characters"
      />

      {value.length > 0 && (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          style={s.clearButton}
          testID={testIDClear}
          disabled={disabled}
        >
          <Text style={s.clearIcon}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

type Props = {
  start: IndoorNode | null;
  destination: IndoorNode | null;
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
};

export default function IndoorRouteInput({
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
}: Readonly<Props>) {
  const startValue = start?.label ?? startText;
  const destValue = destination?.label ?? destText;

  return (
    <View style={s.card} testID="indoorRouteCard">
      <View style={s.rail} pointerEvents="none">
        <MaterialIcons name="radio-button-checked" size={14} color="#111" />
        <View style={s.dots} />
        <MaterialIcons name="place" size={16} color="#D32F2F" />
      </View>

      <View style={s.inputs}>
        <RouteFieldRow
          field="start"
          value={startValue}
          activeField={activeField}
          placeholder="Enter your starting room"
          disabled={disabled}
          testIDRow="indoorRouteStartRow"
          testIDInput="indoorRouteStartInput"
          testIDClear="clearIndoorStart"
          onFocusField={onFocusField}
          onChangeText={onChangeStartText}
          onClear={onClearStart}
        />

        <View style={s.divider} />

        <RouteFieldRow
          field="destination"
          value={destValue}
          activeField={activeField}
          placeholder="Enter your destination room"
          disabled={disabled}
          testIDRow="indoorRouteDestRow"
          testIDInput="indoorRouteDestInput"
          testIDClear="clearIndoorDestination"
          onFocusField={onFocusField}
          onChangeText={onChangeDestText}
          onClear={onClearDestination}
        />
      </View>

      <Pressable
        testID="indoorRouteSwapButton"
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
    paddingVertical: 12,
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
    height: 28,
    marginVertical: 6,
    borderRadius: 1,
    backgroundColor: "rgba(17,17,17,0.25)",
  },

  inputs: {
    flex: 1,
    minWidth: 0,
  },

  inputRow: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 10,
    justifyContent: "center",
    backgroundColor: "rgba(17,17,17,0.04)",
  },

  inputRowActive: {
    backgroundColor: "rgba(17,17,17,0.07)",
  },

  input: {
    fontSize: 15,
    color: "#111",
    paddingVertical: 10,
    paddingRight: 28,
  },

  divider: {
    height: 8,
  },

  swapBtn: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    alignSelf: "stretch",
  },

  swapText: {
    fontSize: 18,
    color: "#111",
    fontWeight: "800",
  },

  clearButton: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  clearIcon: {
    fontSize: 14,
    color: "rgba(17,17,17,0.55)",
    fontWeight: "600",
  },
});
