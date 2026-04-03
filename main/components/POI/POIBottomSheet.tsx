import React, {
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from "react-native";
import BottomSheet, {
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetHandleProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCampusTheme } from "@/hooks/useCampusTheme";
import type { POI, POICategory } from "@/components/POI/types";
import { POI_CATEGORIES } from "@/components/POI/types";
import type { POISearchStatus } from "@/hooks/usePOISearch";
import type { Campus } from "@/components/Buildings/types";

const PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export interface POIBottomSheetRef {
  expand: () => void;
  close: () => void;
}

interface POIBottomSheetProps {
  pois: POI[];
  status: POISearchStatus;
  activeCategory: POICategory | null;
  selectedPOI: POI | null;
  campusTheme: Campus;
  radius: number;
  onRadiusChange: (radius: number) => void;
  onSelectPOI: (poi: POI) => void;
  onGetDirections: (poi: POI) => void;
  onClose: () => void;
  onSheetChange?: (index: number) => void;
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

function formatRadiusLabel(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} km` : `${value} m`;
}

function POIRow({
  poi,
  isSelected,
  onPress,
  onGetDirections,
  brandColor,
}: Readonly<{
  poi: POI;
  isSelected: boolean;
  onPress: () => void;
  onGetDirections: () => void;
  brandColor: string;
}>) {
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
        <View
          style={[styles.iconBadge, { backgroundColor: brandColor + "18" }]}
        >
          <MaterialCommunityIcons
            name={config?.iconName ?? "map-marker"}
            size={20}
            color={brandColor}
          />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>
            {poi.name}
          </Text>
          {poi.distance !== undefined && (
            <Text style={[styles.rowDistance, { color: brandColor }]}>
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
      campusTheme,
      radius,
      onRadiusChange,
      onSelectPOI,
      onGetDirections,
      onClose,
      onSheetChange,
    },
    ref,
  ) => {
    const sheetRef = useRef<BottomSheet>(null);
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const theme = useCampusTheme(campusTheme);

    const [showRadiusMenu, setShowRadiusMenu] = React.useState(false);

    const RADIUS_OPTIONS = [100, 200, 300, 500, 800, 1000];

    const snapPoints = React.useMemo(() => {
      const collapsed = Math.max(260, Math.round(windowHeight * 0.35));
      const topBuffer = insets.top - 6;
      const expanded = Math.max(300, windowHeight - topBuffer);
      return [collapsed, expanded];
    }, [windowHeight, insets.top]);

    useImperativeHandle(ref, () => ({
      expand: () => sheetRef.current?.snapToIndex(0),
      close: () => sheetRef.current?.close(),
    }));

    useEffect(() => {
      if (status === "idle") {
        setShowRadiusMenu(false);
        sheetRef.current?.close();
      } else {
        sheetRef.current?.snapToIndex(0);
      }
    }, [status]);

    const categoryConfig = POI_CATEGORIES.find((c) => c.key === activeCategory);

    const Handle = useCallback(
      (_props: BottomSheetHandleProps) => (
        <View style={styles.handleWrap}>
          <Pressable
            onPress={() => sheetRef.current?.snapToIndex(1)}
            style={styles.handleTapArea}
            testID="poiSheet-handle"
          >
            <View style={styles.handleIndicator} />
          </Pressable>
          <Pressable
            onPress={onClose}
            hitSlop={14}
            style={[styles.handleCloseBtn, { backgroundColor: theme.closeBg }]}
            testID="poi-sheet-close"
            accessibilityRole="button"
            accessibilityLabel="Close POI panel"
          >
            <Text style={[styles.handleCloseText, { color: theme.brand }]}>
              ✕
            </Text>
          </Pressable>
        </View>
      ),
      [onClose, theme],
    );

    const renderItem = useCallback(
      ({ item }: { item: POI }) => {
        return (
          <POIRow
            poi={item}
            isSelected={selectedPOI?.id === item.id}
            onPress={() => {
              setShowRadiusMenu(false);
              onSelectPOI(item);
            }}
            onGetDirections={() => onGetDirections(item)}
            brandColor={theme.brand}
          />
        );
      },
      [selectedPOI, onSelectPOI, onGetDirections, theme.brand],
    );

    const Separator = () => <View style={styles.separator} />;

    const handleRadiusSelect = useCallback(
      (value: number) => {
        setShowRadiusMenu(false);
        onRadiusChange(value);
      },
      [onRadiusChange],
    );

    const renderContent = () => {
      if (status === "loading") {
        return (
          <View style={styles.centred}>
            <ActivityIndicator size="large" color={theme.brand} />
            <Text style={styles.statusText}>Searching nearby places…</Text>
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
        <BottomSheetFlatList<POI>
          data={pois}
          keyExtractor={(item: POI) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={Separator}
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
        onChange={(index) => onSheetChange?.(index)}
        handleComponent={Handle}
        topInset={Math.max(0, insets.top - 6)}
        backgroundStyle={[
          styles.sheetBackground,
          { borderColor: theme.border },
        ]}
      >
        {status === "success" ? (
          <BottomSheetFlatList
            data={pois}
            keyExtractor={(item: POI) => item.id}
            renderItem={renderItem}
            ItemSeparatorComponent={Separator}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View style={styles.sheetHeaderContainer}>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetTitleRow}>
                    {categoryConfig && (
                      <MaterialCommunityIcons
                        name={categoryConfig.iconName}
                        size={20}
                        color="#111"
                      />
                    )}
                    <Text style={styles.sheetTitle}>
                      {categoryConfig ? categoryConfig.label : "Nearby Places"}
                    </Text>
                  </View>
                </View>

                <View style={styles.radiusSection}>
                  <Text style={styles.radiusHint}>
                    Filter radius based on selected campus
                  </Text>

                  <View style={styles.radiusRow}>
                    <Pressable
                      style={[
                        styles.filterButton,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.closeBg,
                        },
                      ]}
                      onPress={() => setShowRadiusMenu((prev) => !prev)}
                    >
                      <MaterialCommunityIcons
                        name="tune-variant"
                        size={16}
                        color={theme.brand}
                      />
                      <Text
                        style={[
                          styles.filterButtonText,
                          { color: theme.brand },
                        ]}
                      >
                        {formatRadiusLabel(radius)}
                      </Text>
                      <MaterialCommunityIcons
                        name={showRadiusMenu ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={theme.brand}
                      />
                    </Pressable>
                  </View>

                  {showRadiusMenu && (
                    <View
                      style={[
                        styles.radiusMenu,
                        { borderColor: theme.border, backgroundColor: "#FFF" },
                      ]}
                    >
                      {RADIUS_OPTIONS.map((option) => {
                        const selected = option === radius;

                        return (
                          <Pressable
                            key={option}
                            style={[
                              styles.radiusOption,
                              selected && { backgroundColor: theme.closeBg },
                            ]}
                            onPress={() => handleRadiusSelect(option)}
                          >
                            <Text
                              style={[
                                styles.radiusOptionText,
                                selected && {
                                  color: theme.brand,
                                  fontWeight: "700",
                                },
                              ]}
                            >
                              {formatRadiusLabel(option)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            }
          />
        ) : (
          <>
            <View style={styles.sheetHeaderContainer}>
              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleRow}>
                  {categoryConfig && (
                    <MaterialCommunityIcons
                      name={categoryConfig.iconName}
                      size={20}
                      color="#111"
                    />
                  )}
                  <Text style={styles.sheetTitle}>
                    {categoryConfig ? categoryConfig.label : "Nearby Places"}
                  </Text>
                </View>
              </View>

              <View style={styles.radiusSection}>
                <Text style={styles.radiusHint}>
                  Filter radius based on selected campus
                </Text>

                <View style={styles.radiusRow}>
                  <Pressable
                    style={[
                      styles.filterButton,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.closeBg,
                      },
                    ]}
                    onPress={() => setShowRadiusMenu((prev) => !prev)}
                  >
                    <MaterialCommunityIcons
                      name="tune-variant"
                      size={16}
                      color={theme.brand}
                    />
                    <Text
                      style={[styles.filterButtonText, { color: theme.brand }]}
                    >
                      {formatRadiusLabel(radius)}
                    </Text>
                    <MaterialCommunityIcons
                      name={showRadiusMenu ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={theme.brand}
                    />
                  </Pressable>
                </View>

                {showRadiusMenu && (
                  <View
                    style={[
                      styles.radiusMenu,
                      { borderColor: theme.border, backgroundColor: "#FFF" },
                    ]}
                  >
                    {RADIUS_OPTIONS.map((option) => {
                      const selected = option === radius;

                      return (
                        <Pressable
                          key={option}
                          style={[
                            styles.radiusOption,
                            selected && { backgroundColor: theme.closeBg },
                          ]}
                          onPress={() => handleRadiusSelect(option)}
                        >
                          <Text
                            style={[
                              styles.radiusOptionText,
                              selected && {
                                color: theme.brand,
                                fontWeight: "700",
                              },
                            ]}
                          >
                            {formatRadiusLabel(option)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {renderContent()}
          </>
        )}
      </BottomSheet>
    );
  },
);

POIBottomSheet.displayName = "POIBottomSheet";
export default POIBottomSheet;

const styles = StyleSheet.create({
  sheetBackground: {
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  sheetInner: {
    flex: 1,
  },
  // Handle — mirrors TravelOptionsPopup exactly
  handleWrap: {
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  handleTapArea: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 6,
  },
  handleIndicator: {
    width: 44,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  handleCloseBtn: {
    position: "absolute",
    right: 16,
    top: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  handleCloseText: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 24,
  },
  // Header
  sheetHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  // List
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.07)",
    marginVertical: 2,
  },
  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "rgba(17,17,17,0.04)",
    marginVertical: 3,
  },
  rowSelected: {
    backgroundColor: "rgba(17,17,17,0.08)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },
  rowDistance: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  rowAddress: {
    fontSize: 12,
    color: "rgba(17,17,17,0.55)",
    marginTop: 1,
    fontWeight: "600",
  },
  rowRight: {
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  photo: {
    width: 72,
    height: 52,
    borderRadius: 10,
  },
  photoPlaceholder: {
    width: 72,
    height: 52,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  directionsBtn: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  directionsBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
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
    color: "rgba(17,17,17,0.55)",
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "600",
  },
  statusText: {
    fontSize: 14,
    color: "rgba(17,17,17,0.55)",
    fontWeight: "700",
    marginTop: 12,
  },
  sheetHeaderContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  radiusSection: {
    paddingBottom: 12,
  },

  radiusHint: {
    fontSize: 12,
    color: "#7A7A7A",
    marginBottom: 8,
  },

  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  radiusMenu: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },

  radiusOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  radiusOptionText: {
    fontSize: 14,
    color: "#111",
  },
});
