import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker, Polygon } from "react-native-maps";
import type { Building, Campus } from "@/components/Buildings/types";
import type { Region } from "react-native-maps";
import { shouldShowBuildingLabel } from "@/components/campus/helper_methods/campusMap.labels";

const CAMPUS_COLORS: Record<
  Campus,
  {
    stroke: string;
    fill: string;
    fillSelected: string;
    labelBg: string;
    labelBorder: string;
  }
> = {
  SGW: {
    stroke: "#912338",
    fill: "rgba(145, 35, 56, 0.30)",
    fillSelected: "rgba(145, 35, 56, 0.55)",
    labelBg: "rgba(145,35,56,0.95)",
    labelBorder: "#6f1a2a",
  },
  LOY: {
    stroke: "#E0B100",
    fill: "rgba(224, 177, 0, 0.30)",
    fillSelected: "rgba(224, 177, 0, 0.55)",
    labelBg: "rgba(224,177,0,0.95)",
    labelBorder: "#8C5F0A",
  },
};

type Props = {
  buildings: Building[];
  selectedBuildingId: string | null;
  userLocationBuildingId: string | null;
  onPickBuilding: (b: Building) => void;
  region: Region | null;
};

const USER_LOCATION_COLOR = {
  stroke: "#4A90D9",
  fill: "rgba(97, 151, 251, 0.35)",
};

/**
 * Render-only layer: draws building polygons + code markers.
 * - Prevents duplicating rendering logic across campuses/screens
 * - Keeps CampusMap focused on layout + interaction flow (search/selection/camera)
 */
export default function BuildingShapesLayer({
  buildings,
  selectedBuildingId,
  userLocationBuildingId,
  onPickBuilding,
  region,
}: Readonly<Props>) {
  return (
    <>
      {buildings.map((b) => {
        const isSelected = selectedBuildingId === b.id;
        const isUserLocation = userLocationBuildingId === b.id;
        const colors = CAMPUS_COLORS[b.campus];
        const showLabel = shouldShowBuildingLabel(b, region);

        // Determine fill and stroke colors based on state
        let fillColor = colors.fill;
        let strokeColor = colors.stroke;
        let strokeWidth = 2;

        if (isUserLocation) {
          fillColor = USER_LOCATION_COLOR.fill;
          strokeColor = USER_LOCATION_COLOR.stroke;
          strokeWidth = 3;
        } else if (isSelected) {
          fillColor = colors.fillSelected;
          strokeWidth = 3;
        }

        return (
          <React.Fragment key={`${b.campus}-${b.id}`}>
            {b.polygon?.length ? (
              <Polygon
                key={`${b.campus}-${b.id}-${fillColor}-${strokeColor}`}
                coordinates={b.polygon}
                tappable
                onPress={() => onPickBuilding(b)}
                strokeColor={strokeColor}
                strokeWidth={strokeWidth}
                fillColor={fillColor}
              />
            ) : null}

            {showLabel ? (
              <Marker
                coordinate={{ latitude: b.latitude, longitude: b.longitude }}
                onPress={() => onPickBuilding(b)}
                tracksViewChanges={isSelected}
                accessibilityLabel={`${b.code} ${b.name}`}
              >
                <View
                  accessible
                  accessibilityRole="button"
                  style={[
                    s.codeCircle,
                    {
                      backgroundColor: colors.labelBg,
                      borderColor: colors.labelBorder,
                    },
                  ]}
                >
                  <Text style={s.codeText}>{b.code}</Text>
                </View>
              </Marker>
            ) : null}
          </React.Fragment>
        );
      })}
    </>
  );
}

const s = StyleSheet.create({
  codeCircle: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  codeText: {
    fontWeight: "900",
    fontSize: 12,
    color: "white",
  },
});
