//.Refactored code
import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";

import type { Campus } from "@/components/Buildings/types";
import { styles } from "@/components/Styles/mapStyle";

// Exported for testing
export function calculatePanValue(
  currentCampus: Campus,
  dx: number,
  toggleWidth: number,
): number {
  const width = toggleWidth || Dimensions.get("window").width - 28;
  const halfWidth = width / 2;
  const currentValue = currentCampus === "SGW" ? 0 : 1;
  const newValue = currentValue + dx / halfWidth;
  return Math.max(0, Math.min(1, newValue));
}

export function determineCampusFromPan(
  currentCampus: Campus,
  dx: number,
  toggleWidth: number,
): Campus {
  const width = toggleWidth || Dimensions.get("window").width - 28;
  const halfWidth = width / 2;
  const currentValue = currentCampus === "SGW" ? 0 : 1;
  const finalValue = currentValue + dx / halfWidth;
  return finalValue > 0.5 ? "LOY" : "SGW";
}

interface ToggleButtonProps {
  focusedCampus: Campus;
  onCampusChange: (campus: Campus) => void;
}

export default function ToggleButton({
  focusedCampus,
  onCampusChange,
}: Readonly<ToggleButtonProps>) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const toggleWidth = useRef(0);
  const focusedCampusRef = useRef<Campus>(focusedCampus);

  useEffect(() => {
    focusedCampusRef.current = focusedCampus;
  }, [focusedCampus]);

  const animateToPosition = useCallback(
    (toValue: number) => {
      Animated.spring(slideAnim, {
        toValue,
        useNativeDriver: false,
        tension: 60,
        friction: 10,
      }).start();
    },
    [slideAnim],
  );

  const switchToCampus = useCallback(
    (campus: Campus) => {
      if (campus === focusedCampusRef.current) return;
      onCampusChange(campus);
    },
    [onCampusChange],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        const clampedValue = calculatePanValue(
          focusedCampusRef.current,
          gestureState.dx,
          toggleWidth.current,
        );
        slideAnim.setValue(clampedValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const targetCampus = determineCampusFromPan(
          focusedCampusRef.current,
          gestureState.dx,
          toggleWidth.current,
        );

        if (targetCampus === "LOY") {
          switchToCampus("LOY");
          animateToPosition(1);
        } else {
          switchToCampus("SGW");
          animateToPosition(0);
        }
      },
    }),
  ).current;

  useEffect(() => {
    animateToPosition(focusedCampus === "SGW" ? 0 : 1);
  }, [focusedCampus, animateToPosition]);

  return (
    <View
      style={styles.campusToggleContainer}
      testID="campusToggle"
      onLayout={(e) => {
        toggleWidth.current = e.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.campusToggleSlider,
          {
            left: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["2%", "52%"],
            }),
            backgroundColor: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["#912338", "#e3ac20"],
            }),
          },
        ]}
      />
      <Pressable
        testID="campusToggle-SGW"
        onPress={() => switchToCampus("SGW")}
        style={styles.campusToggleButton}
        accessibilityRole="button"
        accessibilityLabel="Switch to SGW campus"
        accessibilityState={{ selected: focusedCampus === "SGW" }}
      >
        <Text
          style={[
            styles.campusToggleText,
            focusedCampus === "SGW" && styles.campusToggleTextActive,
          ]}
        >
          SGW
        </Text>
      </Pressable>
      <Pressable
        testID="campusToggle-Loyola"
        onPress={() => switchToCampus("LOY")}
        style={styles.campusToggleButton}
        accessibilityRole="button"
        accessibilityLabel="Switch to Loyola campus"
        accessibilityState={{ selected: focusedCampus === "LOY" }}
      >
        <Text
          style={[
            styles.campusToggleText,
            focusedCampus === "LOY" && styles.campusToggleTextActive,
          ]}
        >
          Loyola
        </Text>
      </Pressable>
    </View>
  );
}
