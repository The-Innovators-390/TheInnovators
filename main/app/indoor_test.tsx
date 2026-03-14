import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  Pressable,
  ImageSourcePropType,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { indoorPlan } from "@/components/indoors/indoorPlan";

type IndoorPlanKey = keyof typeof indoorPlan;

type SvgFloorComponent = React.ComponentType<{
  width?: number | string;
  height?: number | string;
  style?: any;
}>;

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

function getAvailableFloors(building: string): number[] {
  switch (building) {
    case "hb":
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    case "mb":
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    case "ve":
      return [1, 2];
    case "vl":
      return [1, 2];
    case "cc":
      return [1];
    default:
      return [];
  }
}

function isImageAsset(value: unknown): value is ImageSourcePropType {
  return typeof value === "number";
}

function isSvgComponent(value: unknown): value is SvgFloorComponent {
  return typeof value === "function";
}

export default function IndoorDebugScreen() {
  const params = useLocalSearchParams();

  const requestedBuilding =
    typeof params.building === "string" ? params.building.toLowerCase() : "mb";

  const selectedBuilding: IndoorPlanKey =
    requestedBuilding in indoorPlan
      ? (requestedBuilding as IndoorPlanKey)
      : "mb";

  const buildingConfig = indoorPlan[selectedBuilding];

  const floors = getAvailableFloors(selectedBuilding);

  const requestedFloor =
    typeof params.floor === "string" ? Number(params.floor) : NaN;

  const initialFloor =
    Number.isFinite(requestedFloor) && floors.includes(requestedFloor)
      ? requestedFloor
      : floors[0];

  const [currentFloor, setCurrentFloor] = useState<number>(initialFloor);

  const floorAsset =
    buildingConfig.floors[
      currentFloor as keyof (typeof buildingConfig)["floors"]
    ];

  const originalWidth = 1024;
  const originalHeight = 1024;
  const scale = Math.min(MAP_WIDTH / originalWidth, MAP_HEIGHT / originalHeight);
  const renderedMapWidth = originalWidth * scale;
  const renderedMapHeight = originalHeight * scale;

  const headerColor = selectedBuilding === "vl" ? "#D4AF37" : "#9E1B32";

  const renderFloor = () => {
    if (!floorAsset) {
      return (
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonBadge}>Coming soon</Text>
        </View>
      );
    }

    if (isImageAsset(floorAsset)) {
      return (
        <Image
          source={floorAsset}
          style={{
            width: renderedMapWidth,
            height: renderedMapHeight,
            position: "absolute",
          }}
          resizeMode="contain"
        />
      );
    }

    if (isSvgComponent(floorAsset)) {
      const FloorSvg = floorAsset;
      return (
        <FloorSvg
          width={renderedMapWidth}
          height={renderedMapHeight}
          style={styles.floorSvg}
        />
      );
    }

    return (
      <View style={styles.comingSoonContainer}>
        <Text style={styles.comingSoonBadge}>Coming soon</Text>
      </View>
    );
  };

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
        <View style={styles.mapFrame}>{renderFloor()}</View>
      </View>

      <View style={[styles.floorBarWrapper, { borderTopColor: headerColor }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.floorBar}
        >
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
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3efe9",
    position: "relative",
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

  floorSvg: {
    position: "absolute",
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 36,
    borderTopWidth: 6,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f3efe9",
  },
  floorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
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