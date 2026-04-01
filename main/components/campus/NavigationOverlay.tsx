import React from "react";
import { StyleSheet, View } from "react-native";

import type { DirectionStep } from "@/components/campus/helper_methods/googleDirections";

import { TopDirectionsCard } from "@/components/ui/TopDirectionsCard";
import { StepsDropdown } from "@/components/ui/StepsDropdown";
import { BottomNavigationBar } from "@/components/ui/BottomNavigationBar";

type Props = {
  // state from CampusMap
  isNavigating: boolean;
  isNearStart: boolean;
  isArrived: boolean;

  // steps dropdown state
  stepsOpen: boolean;
  onToggleSteps: () => void;
  onCloseSteps: () => void;

  // steps data
  activeSteps: DirectionStep[];
  activeStepIndex: number;

  // top card text
  currentStepDistanceText: string;
  currentStepInstructionText: string;

  // layout
  bottomOffset: number;

  // bottom bar texts
  arrivalTimeText: string;
  durationMinText: string;
  distanceKmText: string;

  // actions
  onExit: () => void;
};

export function NavigationOverlay({
  isNavigating,
  isNearStart,
  isArrived,

  stepsOpen,
  onToggleSteps,
  onCloseSteps,

  activeSteps,
  activeStepIndex,

  currentStepDistanceText,
  currentStepInstructionText,

  bottomOffset,

  arrivalTimeText,
  durationMinText,
  distanceKmText,

  onExit,
}: Readonly<Props>) {
  if (!isNavigating) return null;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <TopDirectionsCard
        visible={isNavigating}
        distanceText={isArrived ? "Arrived" : currentStepDistanceText}
        streetText={
          isArrived
            ? "You've reached your destination."
            : currentStepInstructionText
        }
        onPress={onToggleSteps}
      />

      <StepsDropdown
        visible={stepsOpen && isNavigating}
        steps={activeSteps}
        activeIndex={activeStepIndex}
        onClose={onCloseSteps}
      />

      <BottomNavigationBar
        visible={isNavigating && !isArrived}
        bottomOffset={bottomOffset}
        arrivalTimeText={arrivalTimeText}
        durationMinText={durationMinText}
        distanceKmText={distanceKmText}
        hintText={
          isNearStart ? null : "Go to start to begin live navigation"
        }
        onExit={onExit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
  },
});
