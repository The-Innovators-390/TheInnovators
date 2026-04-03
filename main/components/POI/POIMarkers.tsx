import React from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import { Marker } from "react-native-maps";

type POICategory = "restaurant" | "cafe" | "gym" | "parking";

type POI = {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    category: POICategory;
};

interface POIMarkersProps {
    pois: POI[];
    selectedPOI: POI | null;
    onPress: (poi: POI) => void;
}

function getCategoryEmoji(category: POICategory): string {
    switch (category) {
        case "restaurant":
            return "🍽️";
        case "cafe":
            return "☕";
        case "gym":
            return "🏋️";
        case "parking":
            return "🅿️";
        default:
            return "📍";
    }
}

export default function POIMarkers({
                                       pois,
                                       selectedPOI,
                                       onPress,
                                   }: Readonly<POIMarkersProps>) {
    return (
        <>
            {pois.map((poi) => {
                const isSelected = selectedPOI?.id === poi.id;

                return (
                    <Marker
                        key={poi.id}
                        coordinate={{
                            latitude: poi.latitude,
                            longitude: poi.longitude,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        onPress={() => onPress(poi)}
                    >
                        <Pressable
                            onPress={() => onPress(poi)}
                            style={[
                                markerStyles.markerBubble,
                                isSelected && markerStyles.selectedMarkerBubble,
                            ]}
                        >
                            <Text style={markerStyles.emoji}>
                                {getCategoryEmoji(poi.category)}
                            </Text>
                        </Pressable>
                    </Marker>
                );
            })}
        </>
    );
}

const markerStyles = StyleSheet.create({
    markerBubble: {
        minWidth: 38,
        minHeight: 38,
        borderRadius: 19,
        backgroundColor: "#1F6B2A",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    selectedMarkerBubble: {
        backgroundColor: "#2C8A3A",
        transform: [{ scale: 1.08 }],
    },
    emoji: {
        fontSize: 18,
        textAlign: "center",
    },
});