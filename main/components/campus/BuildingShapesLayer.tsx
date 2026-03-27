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

function getBuildingStyle(
  building: Building,
  selectedBuildingId: string | null,
  userLocationBuildingId: string | null,
) {
  const isSelected = selectedBuildingId === building.id;
  const isUserLocation = userLocationBuildingId === building.id;
  const colors = CAMPUS_COLORS[building.campus];

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

  return {
    colors,
    fillColor,
    strokeColor,
    strokeWidth,
  };
}

export default function BuildingShapesLayer({
  buildings,
  selectedBuildingId,
  userLocationBuildingId,
  onPickBuilding,
  region,
}: Readonly<Props>) {
  const polygonBuildings = buildings.filter((b) => b.polygon?.length);
  const labelBuildings = buildings.filter((b) =>
    shouldShowBuildingLabel(b, region),
  );

  return (
    <>
      {polygonBuildings.map((b) => {
        const { fillColor, strokeColor, strokeWidth } = getBuildingStyle(
          b,
          selectedBuildingId,
          userLocationBuildingId,
        );

        return (
          <Polygon
            key={`polygon-${b.campus}-${b.id}`}
            coordinates={b.polygon}
            tappable
            onPress={() => onPickBuilding(b)}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            fillColor={fillColor}
          />
        );
      })}

      {labelBuildings.map((b) => {
        const { colors } = getBuildingStyle(
          b,
          selectedBuildingId,
          userLocationBuildingId,
        );

        return (
          <Marker
            key={`marker-${b.campus}-${b.id}`}
            coordinate={{ latitude: b.latitude, longitude: b.longitude }}
            onPress={() => onPickBuilding(b)}
            tracksViewChanges={false}
            accessibilityLabel={`${b.code} ${b.name}`}
          >
            <View
              accessible
              accessibilityRole="button"
              testID={`building-marker-${b.campus}-${b.id}`}
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
