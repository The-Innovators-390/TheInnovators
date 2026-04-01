import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetFlatList,
} from "@gorhom/bottom-sheet";
import type { POI, POICategory } from "@/components/POI/types";
import { POI_CATEGORIES } from "@/components/POI/types";
import type { POISearchStatus } from "@/hooks/usePOISearch";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

export interface POIBottomSheetRef {
  expand: () => void;
  close: () => void;
}

interface POIBottomSheetProps {
  pois: POI[];
  status: POISearchStatus;
  activeCategory: POICategory | null;
  selectedPOI: POI | null;
  onSelectPOI: (poi: POI) => void;
  onGetDirections: (poi: POI) => void;
  onClose: () => void;
}

function photoUrl(ref: string) {
  return (
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=120&photo_reference=${ref}&key=${PLACES_API_KEY}`
  );
}

function formatDistance(metres: number): string {
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

function POIRow({
  poi,
  isSelected,
  onPress,
  onGetDirections,
}: {
  poi: POI;
  isSelected: boolean;
  onPress: () => void;
  onGetDirections: () => void;
}) {
  const config = POI_CATEGORIES.find((c) => c.key === poi.category);

  return (
    <Pressable
      testID={`poi-row-${poi.id}`}
      onPress={onPress}
      style={[styles.row, isSelected && styles.rowSelected]}
      accessibilityRole="button"
      accessibilityLabel={`${poi.name}, ${formatDistance(poi.distance ?? 0)} away`}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons
            name={config?.iconName ?? "map-marker"}
            size={18}
            color="#333333"
            />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>
            {poi.name}
          </Text>
          {poi.distance !== undefined && (
            <Text style={styles.rowDistance}>
              {formatDistance(poi.distance)}
            </Text>
          )}
          {poi.address ? (
            <Text style={styles.rowAddress} numberOfLines={1}>
              {poi.address}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rowRight}>
        {poi.photoReference ? (
          <Image
            source={{ uri: photoUrl(poi.photoReference) }}
            style={styles.photo}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.photoPlaceholder} />
        )}
        <Pressable
          testID={`poi-directions-${poi.id}`}
          onPress={onGetDirections}
          style={styles.directionsBtn}
          accessibilityRole="button"
          accessibilityLabel={`Get directions to ${poi.name}`}
        >
          <Text style={styles.directionsBtnText}>Get Directions</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const POIBottomSheet = forwardRef<POIBottomSheetRef, POIBottomSheetProps>(
  (
    {
      pois,
      status,
      activeCategory,
      selectedPOI,
      onSelectPOI,
      onGetDirections,
      onClose,
    },
    ref,
  ) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = ["40%", "80%"];

    useImperativeHandle(ref, () => ({
      expand: () => sheetRef.current?.snapToIndex(0),
      close: () => sheetRef.current?.close(),
    }));

    // Auto-open when status changes to loading/success/no_results
    useEffect(() => {
      if (status === "idle") {
        sheetRef.current?.close();
      } else {
        sheetRef.current?.snapToIndex(0);
      }
    }, [status]);

    const categoryConfig = POI_CATEGORIES.find(
      (c) => c.key === activeCategory,
    );

    const renderItem = useCallback(
      ({ item }: { item: POI }) => (
        <POIRow
          poi={item}
          isSelected={selectedPOI?.id === item.id}
          onPress={() => onSelectPOI(item)}
          onGetDirections={() => onGetDirections(item)}
        />
      ),
      [selectedPOI, onSelectPOI, onGetDirections],
    );

    const renderContent = () => {
      if (status === "loading") {
        return (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color="#912338" />
            <Text style={styles.statusText}>Searching nearby places…</Text>
          </View>
        );
      }

      if (status === "location_unavailable") {
        return (
          <View style={styles.centred}>
            <Text style={styles.statusTitle}>Location unavailable</Text>
            <Text style={styles.statusSub}>
              Enable location access so we can find POIs near you.
            </Text>
          </View>
        );
      }

      if (status === "error") {
        return (
          <View style={styles.centred}>
            <Text style={styles.statusTitle}>Something went wrong</Text>
            <Text style={styles.statusSub}>
              Could not fetch nearby places. Check your connection and try
              again.
            </Text>
          </View>
        );
      }

      if (status === "no_results") {
        return (
          <View style={styles.centred}>
            <Text style={styles.statusTitle}>No results found</Text>
            <Text style={styles.statusSub}>
              No {categoryConfig?.label.toLowerCase() ?? "places"} found near
              this campus. Try a different category.
            </Text>
          </View>
        );
      }

      return (
        <BottomSheetFlatList
          data={pois}
          keyExtractor={(item: POI) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      );
    };

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.sheetInner}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleRow}>
                {categoryConfig && (
                    <MaterialCommunityIcons
                    name={categoryConfig.iconName}
                    size={20}
                    color="#1a1a1a"
                    />
                )}
                <Text style={styles.sheetTitle}>
                    {categoryConfig ? categoryConfig.label : "Nearby Places"}
                </Text>
                </View>
            <Pressable
              testID="poi-sheet-close"
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close POI panel"
            >
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          {renderContent()}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

POIBottomSheet.displayName = "POIBottomSheet";
export default POIBottomSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 12,
  },
  handleIndicator: {
    backgroundColor: "#d0d0d0",
    width: 40,
  },
  sheetInner: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e8e8e8",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  closeBtn: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#efefef",
    marginVertical: 4,
  },
  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  rowSelected: {
    backgroundColor: "#fdf1f3",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  rowDistance: {
    fontSize: 12,
    color: "#912338",
    fontWeight: "500",
    marginTop: 2,
  },
  rowAddress: {
    fontSize: 12,
    color: "#888",
    marginTop: 1,
  },
  rowRight: {
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  photo: {
    width: 72,
    height: 56,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: 72,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  directionsBtn: {
    backgroundColor: "#2d7a2d",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  directionsBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  // Status screens
  centred: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
  },
  statusSub: {
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 19,
  },
  statusText: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
  },
  sheetTitleRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
},
});
