import React, { ComponentType } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SvgProps } from "react-native-svg";
import { IndoorEdge, IndoorNode } from "./types";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

interface IndoorMapViewerProps {
  SvgComponent?: ComponentType<SvgProps>;
  nodes: IndoorNode[];
  edges: IndoorEdge[];
}

export default function IndoorMapViewer({
  SvgComponent,
  nodes,
  edges,
}: Readonly<IndoorMapViewerProps>) {
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  if (!SvgComponent || typeof SvgComponent === "number") {
    console.warn(
      `IndoorMapViewer: SvgComponent is ${typeof SvgComponent}. Check Metro config and imports.`,
    );

    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>SVG could not be loaded</Text>
        </View>
      </View>
    );
  }

  const availableHeight = height - 160;

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            styles.svgWrapper,
            animatedStyle,
            {
              width: width,
              height: availableHeight,
            },
          ]}
        >
          <SvgComponent
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
          />
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  svgWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    flex: 1,
    width: "100%",
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 16,
    color: "#444",
    fontWeight: "600",
  },
});
