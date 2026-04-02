import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Marker } from "react-native-maps";
import type { POI } from "@/components/POI/types";
import { POI_CATEGORIES } from "@/components/POI/types";

interface POIMarkersProps {
  pois: POI[];
  selectedPOI: POI | null;
  onPress: (poi: POI) => void;
}

export default function POIMarkers({
  pois,
  selectedPOI,
  onPress,
}: Readonly<POIMarkersProps>) {
  return (
    <>
      {pois.map((poi) => {
        const config = POI_CATEGORIES.find((c: any) => c.key === poi.category);
        const isSelected = selectedPOI?.id === poi.id;

        return (
          <Marker
            key={poi.id}
            testID={`poi-marker-${poi.id}`}
            coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
            onPress={() => onPress(poi)}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={isSelected}
          >
            <View style={styles.container}>
              {/* Pin head — circle with icon */}
              <View
                style={[styles.pinHead, isSelected && styles.pinHeadSelected]}
              >
                <Text style={styles.pinIcon}>{config?.emoji ?? "📍"}</Text>
              </View>
              {/* Pin tail */}
              <View
                style={[styles.pinTail, isSelected && styles.pinTailSelected]}
              />
            </View>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  pinHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2d7a2d",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  pinHeadSelected: {
    backgroundColor: "#1a5c1a",
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#2d7a2d",
    marginTop: -1,
  },
  pinTailSelected: {
    borderTopColor: "#1a5c1a",
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 14,
  },
  pinIcon: {
    fontSize: 20,
  },
});
