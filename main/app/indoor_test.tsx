import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Svg, { Line, Circle, Text as SvgText } from "react-native-svg";
import { indoorPlan } from "@/components/indoors/indoorPlan";

type IndoorPlanKey = keyof typeof indoorPlan;

type IndoorNode = {
  id: string;
  type: string;
  buildingId?: string;
  floor?: number;
  x: number;
  y: number;
  label?: string;
  accessible?: boolean;
};

type IndoorEdge = {
  source: string;
  target: string;
  type?: string;
  weight?: number;
  accessible?: boolean;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAP_WIDTH = SCREEN_WIDTH - 24;
const MAP_HEIGHT = SCREEN_HEIGHT * 0.62;

function getFloorLabel(building: string, floor: number) {
  if (building === "mb") {
    if (floor === 1) return "S2";
    if (floor === 2) return "1";
  }

  return floor.toString();
}

function getBuildingDisplayName(building: string) {
  switch (building) {
    case "hb":
      return "Hall Building";
    case "mb":
      return "MB Building";
    case "ve":
      return "VE Building";
    case "vl":
      return "Vanier Library";
    case "cc":
      return "CC Building";
    default:
      return building.toUpperCase();
  }
}

export default function IndoorDebugScreen() {
  const params = useLocalSearchParams<{
    building?: string;
    floor?: string;
  }>();

  const requestedBuilding =
    typeof params.building === "string" ? params.building.toLowerCase() : "mb";

  const selectedBuilding: IndoorPlanKey =
    requestedBuilding in indoorPlan
      ? (requestedBuilding as IndoorPlanKey)
      : "mb";

  const buildingConfig = indoorPlan[selectedBuilding];
  const floorData = buildingConfig.graph;

  const allNodes: IndoorNode[] = floorData.nodes ?? [];
  const allEdges: IndoorEdge[] = floorData.edges ?? [];

  const floors = [
    ...new Set(
      allNodes
        .map((node) => node.floor)
        .filter((floor): floor is number => typeof floor === "number"),
    ),
  ].sort((a, b) => a - b);

  const requestedFloor =
    typeof params.floor === "string" ? Number(params.floor) : NaN;

  const initialFloor =
    Number.isFinite(requestedFloor) && floors.includes(requestedFloor)
      ? requestedFloor
      : floors[0];

  const [currentFloor, setCurrentFloor] = useState<number>(initialFloor);

  const floorImage =
    buildingConfig.floors[
      currentFloor as keyof (typeof buildingConfig)["floors"]
    ];

  const nodes = useMemo(
    () => allNodes.filter((node) => node.floor === currentFloor),
    [allNodes, currentFloor],
  );

  const nodeIdsOnFloor = useMemo(
    () => new Set(nodes.map((node) => node.id)),
    [nodes],
  );

  const edges = useMemo(
    () =>
      allEdges.filter(
        (edge) =>
          nodeIdsOnFloor.has(edge.source) && nodeIdsOnFloor.has(edge.target),
      ),
    [allEdges, nodeIdsOnFloor],
  );

  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const originalWidth = 1024;
  const originalHeight = 1024;
  const scale = Math.min(MAP_WIDTH / originalWidth, MAP_HEIGHT / originalHeight);
  const renderedMapWidth = originalWidth * scale;
  const renderedMapHeight = originalHeight * scale;

  const headerColor = selectedBuilding === "vl" ? "#D4AF37" : "#9E1B32";

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { backgroundColor: headerColor }]}>
        <Text style={styles.headerTitle}>
          {getBuildingDisplayName(selectedBuilding)}
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={styles.exitButton}
          testID="indoorMapExitButton"
        >
          <Text style={styles.exitButtonText}>Exit</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.mapFrame}>
          {floorImage ? (
            <>
              <Image
                source={floorImage}
                style={{
                  width: renderedMapWidth,
                  height: renderedMapHeight,
                  position: "absolute",
                }}
                resizeMode="contain"
              />

              <Svg
                width={renderedMapWidth}
                height={renderedMapHeight}
                style={StyleSheet.absoluteFill}
              >
                {edges.map((edge, index) => {
                  const sourceNode = nodeMap.get(edge.source);
                  const targetNode = nodeMap.get(edge.target);

                  if (!sourceNode || !targetNode) return null;

                  return (
                    <Line
                      key={`edge-${index}`}
                      x1={sourceNode.x * scale}
                      y1={sourceNode.y * scale}
                      x2={targetNode.x * scale}
                      y2={targetNode.y * scale}
                      stroke={edge.accessible ? "#2563eb" : "#888"}
                      strokeWidth={2}
                    />
                  );
                })}

                {nodes.map((node) => {
                  let color = "#16a34a";

                  if (node.type === "room") color = "#dc2626";
                  if (node.type?.includes("door")) color = "#f59e0b";
                  if (node.type?.includes("hallway")) color = "#2563eb";

                  return (
                    <React.Fragment key={node.id}>
                      <Circle
                        cx={node.x * scale}
                        cy={node.y * scale}
                        r={4}
                        fill={color}
                      />
                      {node.label ? (
                        <SvgText
                          x={node.x * scale + 5}
                          y={node.y * scale - 5}
                          fontSize="9"
                          fill="#111"
                        >
                          {node.label}
                        </SvgText>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </Svg>
            </>
          ) : (
            <View style={styles.comingSoonContainer}>
              <Text style={styles.comingSoonBadge}>Coming soon</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.floorBarWrapper, { borderTopColor: headerColor }]}>
        <View style={styles.floorBar}>
          {floors.map((floor) => {
            const isActive = currentFloor === floor;

            return (
              <Pressable
                key={floor}
                onPress={() => setCurrentFloor(floor)}
                style={[
                  styles.floorButton,
                  isActive && { backgroundColor: headerColor },
                ]}
                testID={`floorButton-${floor}`}
              >
                <Text
                  style={[
                    styles.floorButtonText,
                    isActive && styles.floorButtonTextActive,
                  ]}
                >
                  {getFloorLabel(selectedBuilding, floor)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3efe9",
  },

  header: {
    height: 56,
    marginTop: 8,
    marginHorizontal: 12,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: "white",
    fontSize: 26,
    fontWeight: "700",
  },
  exitButton: {
    position: "absolute",
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  exitButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },

  mapFrame: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    backgroundColor: "#f7f4ee",
    borderWidth: 1,
    borderColor: "#d6d0c7",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  comingSoonContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoonBadge: {
    backgroundColor: "#cfcfcf",
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },

  floorBarWrapper: {
    borderTopWidth: 6,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f3efe9",
  },
  floorBar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  floorButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#9b9b9b",
    alignItems: "center",
    justifyContent: "center",
  },
  floorButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  floorButtonTextActive: {
    color: "white",
  },
});