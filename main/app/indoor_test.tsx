import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import Svg, { Line, Circle, Text as SvgText } from "react-native-svg";
import { indoorPlan } from "@/components/indoors/indoorPlan";

const selectedBuilding = "mb";
const selectedFloor = 2;

const buildingConfig = indoorPlan[selectedBuilding];
const floorData = buildingConfig.graph;
const floorImage = buildingConfig.floors[selectedFloor];

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
const MAP_WIDTH = SCREEN_WIDTH - 24;

export default function IndoorDebugScreen() {
  const nodes: IndoorNode[] = floorData.nodes ?? [];
  const edges: IndoorEdge[] = floorData.edges ?? [];
  const buildingId = floorData.meta?.buildingId ?? "Unknown";

  const floors = [
    ...new Set(nodes.map((node) => node.floor).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b));

  const originalWidth = 1024;
  const originalHeight = 1024;
  const scale = MAP_WIDTH / originalWidth;
  const mapHeight = originalHeight * scale;

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{buildingId} Indoor Debug View</Text>
      <Text style={styles.meta}>
        Nodes: {nodes.length} | Edges: {edges.length}
      </Text>
      <Text style={styles.meta}>Floors detected: {floors.join(", ")}</Text>

      <View
        style={[styles.mapWrapper, { width: MAP_WIDTH, height: mapHeight }]}
      >
        <Image
          source={floorImage}
          style={{ width: MAP_WIDTH, height: mapHeight, position: "absolute" }}
          resizeMode="contain"
        />

        <Svg
          width={MAP_WIDTH}
          height={mapHeight}
          style={StyleSheet.absoluteFill}
        >
          {edges.map((edge, index) => {
            const sourceNode = nodeMap.get(edge.source) as
              | IndoorNode
              | undefined;
            const targetNode = nodeMap.get(edge.target) as
              | IndoorNode
              | undefined;

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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  meta: {
    fontSize: 14,
    color: "#444",
    marginBottom: 12,
  },
  mapWrapper: {
    position: "relative",
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fafafa",
  },
});
