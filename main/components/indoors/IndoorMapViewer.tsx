import React from "react";
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Image,
  ImageSourcePropType,
} from "react-native";
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
  imageSource?: ImageSourcePropType;
  nodes: IndoorNode[];
  edges: IndoorEdge[];
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function IndoorMapViewer({
  imageSource,
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

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!imageSource) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Image could not be loaded</Text>
      </View>
    );
  }

  const availableHeight = height - 160;

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.viewport, { width, height: availableHeight }]}>
          <Animated.View style={[styles.imageWrapper, animatedStyle]}>
            <AnimatedImage
              source={imageSource}
              style={[styles.image, { width, height: availableHeight }]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  viewport: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  imageWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    alignSelf: "center",
  },
  placeholderText: {
    fontSize: 16,
    color: "#444",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 40,
  },
});