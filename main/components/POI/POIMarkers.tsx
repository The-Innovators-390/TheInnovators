import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";
import type { POI } from "@/components/POI/types";
import { POI_CATEGORIES } from "@/components/POI/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
        const config = POI_CATEGORIES.find((c) => c.key === poi.category);
        const isSelected = selectedPOI?.id === poi.id;

        return (
          <Marker
            key={poi.id}
            testID={`poi-marker-${poi.id}`}
            coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
            onPress={() => onPress(poi)}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={[styles.pin, isSelected && styles.pinSelected]}>
              <MaterialCommunityIcons
                name={config?.iconName ?? "map-marker"}
                size={18}
                color="#ffffff"
              />
              <View
                style={[styles.pinTip, isSelected && styles.pinTipSelected]}
              />
            </View>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2d7a2d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  pinSelected: {
    backgroundColor: "#1a5c1a",
    transform: [{ scale: 1.2 }],
  },
  pinTip: {
    position: "absolute",
    bottom: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#2d7a2d",
  },
  pinTipSelected: {
    borderTopColor: "#1a5c1a",
  },
});
