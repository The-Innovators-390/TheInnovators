import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  Image,
  ImageSourcePropType,
} from "react-native";
import Svg, { Polyline, Circle, Text as SvgText } from "react-native-svg";
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
}

const AnimatedImage = Animated.createAnimatedComponent(Image);
const AnimatedView = Animated.createAnimatedComponent(View);

export default function IndoorMapViewer({
  imageSource,
  nodes,
  edges,
  path = [],
}: Readonly<IndoorMapViewerProps>) {
  const { width, height } = useWindowDimensions();
  const availableHeight = height - INDOOR_LAYOUT.AVAILABLE_HEIGHT_OFFSET;

  // State to store the actual image dimensions
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

  // Calculate the actual scale and offsets used by "contain"
  const layoutInfo = useMemo(() => {
    const containerRatio = width / availableHeight;
    const imageRatio = imgSize.w / imgSize.h;

    let renderedWidth, renderedHeight, offsetX, offsetY;

    if (imageRatio > containerRatio) {
      // Image is wider than container ratio (Width-constrained)
      renderedWidth = width;
      renderedHeight = width / imageRatio;
      offsetX = 0;
      offsetY = (availableHeight - renderedHeight) / 2;
    } else {
      // Image is taller than container ratio (Height-constrained)
      renderedWidth = availableHeight * imageRatio;
      renderedHeight = availableHeight;
      offsetX = (width - renderedWidth) / 2;
      offsetY = 0;
    }

    const scale = renderedWidth / imgSize.w;

    return { scale, offsetX, offsetY, renderedWidth, renderedHeight };
  }, [imgSize, width, availableHeight]);

  // Gesture State
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pathPoints = useMemo(() => {
    if (!path || path.length < 2) {
      return "";
    }

    return path
      .map(
        (node) => `${node.x * layoutInfo.scale},${node.y * layoutInfo.scale}`,
      )
      .join(" ");
  }, [path, layoutInfo.scale]);

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
            {/* The Floor Plan Image */}
            <AnimatedImage
              source={imageSource}
              style={[styles.image, { width, height: availableHeight }]}
              resizeMode="contain"
            />

            {/* SVG Overlay centered on the image pixels */}
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
                {/* Uncomment the following block to display the edges */}
                {/*
                {edges.map((edge, index) => {
                  const startNode = nodes.find((n) => n.id === edge.source);
                  const endNode = nodes.find((n) => n.id === edge.target);
                  if (!startNode || !endNode) return null;

                  return (
                    <Line
                      key={`edge-${index}`}
                      x1={startNode.x * layoutInfo.scale}
                      y1={startNode.y * layoutInfo.scale}
                      x2={endNode.x * layoutInfo.scale}
                      y2={endNode.y * layoutInfo.scale}
                      stroke={edge.accessible ? "#2563eb" : "#999"}
                      strokeWidth="2"
                      strokeOpacity={0.6}
                    />
                  );
                })}
                */}

                {nodes.map((node) => {
                  let color = "#16a34a";
                  if (node.type === "room") color = "#dc2626";
                  if (node.type?.includes("door")) color = "#f59e0b";

                  return (
                    <React.Fragment key={node.id}>
                      <Circle
                        cx={node.x * layoutInfo.scale}
                        cy={node.y * layoutInfo.scale}
                        r="4"
                        fill={color}
                      />
                      {node.label && (
                        <SvgText
                          x={node.x * layoutInfo.scale + 6}
                          y={node.y * layoutInfo.scale - 6}
                          fontSize="10"
                          fill="#333"
                          fontWeight="bold"
                        >
                          {node.label}
                        </SvgText>
                      )}
                    </React.Fragment>
                  );
                })}
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
