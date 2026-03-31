import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Image,
  ImageSourcePropType,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { IndoorEdge, IndoorNode } from "./types";
import { INDOOR_LAYOUT } from "./indoor.constants";
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
  path?: IndoorNode[];
  currentFloor: number;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedView = Animated.createAnimatedComponent(View);

export default function IndoorMapViewer({
  imageSource,
  nodes,
  edges,
  path = [],
  currentFloor,
}: Readonly<IndoorMapViewerProps>) {
  const { width, height } = useWindowDimensions();
  const availableHeight = height - INDOOR_LAYOUT.AVAILABLE_HEIGHT_OFFSET;

  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    if (imageSource) {
      const asset = Image.resolveAssetSource(imageSource);
      if (asset && asset.uri) {
        Image.getSize(
          asset.uri,
          (w, h) => {
            setImgSize({ w, h });
          },
          (error) => {
            console.error("Failed to get image size:", error);
          },
        );
      }
    }
  }, [imageSource]);

  const layoutInfo = useMemo(() => {
    const containerRatio = width / availableHeight;
    const imageRatio = imgSize.w / imgSize.h;

    let renderedWidth, renderedHeight, offsetX, offsetY;

    if (imageRatio > containerRatio) {
      renderedWidth = width;
      renderedHeight = width / imageRatio;
      offsetX = 0;
      offsetY = (availableHeight - renderedHeight) / 2;
    } else {
      renderedWidth = availableHeight * imageRatio;
      renderedHeight = availableHeight;
      offsetX = (width - renderedWidth) / 2;
      offsetY = 0;
    }

    const scale = renderedWidth / imgSize.w;

    return { scale, offsetX, offsetY, renderedWidth, renderedHeight };
  }, [imgSize, width, availableHeight]);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const floorPath = useMemo(() => {
    return path.filter((node) => node.floor === currentFloor);
  }, [path, currentFloor]);

  const pathPoints = useMemo(() => {
    if (!floorPath || floorPath.length < 2) {
      return "";
    }

    return floorPath
      .map(
        (node) => `${node.x * layoutInfo.scale},${node.y * layoutInfo.scale}`,
      )
      .join(" ");
  }, [floorPath, layoutInfo.scale]);

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

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <View style={[styles.viewport, { width, height: availableHeight }]}>
          <AnimatedView
            style={[
              styles.imageWrapper,
              animatedStyle,
              { width, height: availableHeight },
            ]}
          >
            <AnimatedImage
              source={imageSource}
              style={[styles.image, { width, height: availableHeight }]}
              resizeMode="contain"
            />

            <View
              style={{
                position: "absolute",
                left: layoutInfo.offsetX,
                top: layoutInfo.offsetY,
                width: layoutInfo.renderedWidth,
                height: layoutInfo.renderedHeight,
              }}
            >
              <Svg
                width={layoutInfo.renderedWidth}
                height={layoutInfo.renderedHeight}
              >
                {pathPoints.length > 0 && (
                  <Polyline
                    points={pathPoints}
                    fill="none"
                    stroke="#1A73E8"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </Svg>
            </View>
          </AnimatedView>
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