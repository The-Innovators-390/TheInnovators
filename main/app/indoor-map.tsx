import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function IndoorMapScreen() {
  const { buildingName, campus } = useLocalSearchParams<{
    buildingName?: string;
    campus?: string;
  }>();
  const insets = useSafeAreaInsets();

  const title = buildingName ?? "Indoor Map";

  const theme =
    campus === "LOY"
      ? {
          brand: "#E0B100",
          brandDark: "#C79B00",
          text: "#6B5500",
        }
      : {
          brand: "#B01C37",
          brandDark: "#9A1830",
          text: "#912338",
        };

  const floors = useMemo(() => {
    const normalized = title.toLowerCase();

    if (normalized.includes("hall")) {
      return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    }

    if (
      normalized.includes("john molson") ||
      normalized.includes("jmsb") ||
      normalized.includes("(mb)") ||
      normalized === "mb" ||
      normalized.includes(" mb ")
    ) {
      return [
        "S2",
        "S1",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
      ];
    }

    if (normalized.includes("central building") || normalized === "cc") {
      return ["1"];
    }

    if (normalized.includes("vanier extension") || normalized === "ve") {
      return ["1", "2"];
    }

    if (normalized.includes("vanier library") || normalized === "vl") {
      return ["1", "2", "3"];
    }

    if (normalized.includes("lb library") || normalized === "lb") {
      return ["1", "2", "3", "4", "5"];
    }

    return [];
  }, [title]);

  const [selectedFloor, setSelectedFloor] = useState(
    floors.length > 0 ? floors[0] : "1",
  );

  useEffect(() => {
    setSelectedFloor(floors.length > 0 ? floors[0] : "1");
  }, [floors]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
      </Pressable>

      <View
        style={[
          styles.titleBar,
          {
            backgroundColor: theme.brand,
            borderColor: theme.brandDark,
          },
        ]}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.mapArea}>
        <View style={styles.mapPlaceholder}>
          <Text style={[styles.comingSoonText, { color: theme.text }]}>
            Floor {selectedFloor} coming soon
          </Text>
        </View>
      </View>

      {floors.length > 0 && (
        <View
          style={[
            styles.floorPanel,
            { paddingBottom: Math.max(insets.bottom + 12, 24) },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.floorBar}
          >
            {floors.map((floor) => {
              const isSelected = floor === selectedFloor;

              return (
                <Pressable
                  key={floor}
                  onPress={() => setSelectedFloor(floor)}
                  hitSlop={8}
                  style={[
                    styles.floorButton,
                    isSelected && {
                      backgroundColor: theme.brand,
                    },
                  ]}
                >
                  <Text style={styles.floorButtonText}>{floor}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F1EB",
    paddingTop: 56,
    paddingHorizontal: 8,
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 18,
    marginLeft: 4,
  },

  backText: {
    fontSize: 16,
    fontWeight: "700",
  },

  titleBar: {
    borderRadius: 28,
    minHeight: 55,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 18,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },

  mapArea: {
    flex: 1,
    marginBottom: 10,
    alignItems: "center",
  },

  mapPlaceholder: {
    height: 550,
    borderWidth: 1,
    borderColor: "#D1CBC2",
    backgroundColor: "#F8F6F2",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    width: "100%",
    maxWidth: 370,
  },

  comingSoonText: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },

  floorPanel: {
    backgroundColor: "#F4F1EB",
    paddingTop: 8,
  },

  floorBar: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderTopWidth: 2,
  paddingTop: 12,
  paddingHorizontal: 12,
  minWidth: "100%",
},

  floorButton: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#A9A9A9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    marginRight: 8,
  },

  floorButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});