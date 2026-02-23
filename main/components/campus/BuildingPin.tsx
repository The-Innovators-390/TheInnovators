import React from "react";
import {
  Image,
  StyleSheet,
  View,
  Text,
  ImageSourcePropType,
} from "react-native";
import type { Campus } from "@/components/Buildings/types";

const SGW_PIN: ImageSourcePropType = require("@/assets/pins/pin_sgw.png");
const LOY_PIN: ImageSourcePropType = require("@/assets/pins/pin_loyola.png");
const MAP_PIN: ImageSourcePropType = require("@/assets/pins/pin_rm.png");

type Props = {
  code: string;
  campus: Campus;
  size?: number; // controls the whole pin size
  /** When set, shown on the pin instead of code (e.g. building name for route pins). */
  label?: string;
  /** "map" = purple pin for route start/destination; "popup" = campus-specific (SGW/Loyola) for building info */
  variant?: "map" | "popup";
};

export default function BuildingPin({
  code,
  campus,
  size = 44,
  label,
  variant = "popup",
}: Readonly<Props>) {
  const src: ImageSourcePropType = (() => {
    if (variant === "map") return MAP_PIN;
    return campus === "SGW" ? SGW_PIN : LOY_PIN;
  })();
  const displayText = label ?? code;
  const pinHeight = size * 1.5;

  // Transparent buffer on every side so Android's Marker bitmap capture never
  // clips the outermost pixels of the pin graphic (right edge + bottom tip).
  const PAD = 4;

  return (
    // The outer View declares the total bitmap dimensions for Android's Marker.
    // Using absolute positioning for children guarantees the container is sized
    // by its own style, not inferred from content measurement.
    <View
      collapsable={false}
      style={{
        width: size + PAD * 2,
        height: pinHeight + PAD * 2,
      }}
    >
      <Image
        source={src}
        style={{
          position: "absolute",
          top: PAD,
          left: PAD,
          width: size,
          height: pinHeight,
        }}
        resizeMode="contain"
        fadeDuration={0}
      />

      <View
        style={{
          position: "absolute",
          top: PAD + Math.round(pinHeight * 0.13),
          left: PAD,
          width: size,
          alignItems: "center",
          justifyContent: "center",
        }}
        pointerEvents="none"
      >
        <Text
          style={[
            styles.code,
            {
              fontSize: label
                ? Math.round(size * 0.22)
                : Math.round(size * 0.3),
            },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {displayText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  code: {
    color: "white",
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});
