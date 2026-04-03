import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
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
  Modal,
} from "react-native";
import Slider from "@react-native-community/slider";
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetHandleProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useCampusTheme } from "@/hooks/useCampusTheme";
import type { POI, POICategory } from "@/components/POI/types";
import { POI_CATEGORIES } from "@/components/POI/types";
import type { POISearchStatus } from "@/hooks/usePOISearch";
import type { Campus } from "@/components/Buildings/types";
import { bottomSheetStyle } from "../Styles/bottomSheetStyle";

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
    `?maxwidth=1200&photo_reference=${ref}&key=${PLACES_API_KEY}`
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
  onImagePress,
  brandColor,
}: Readonly<{
  poi: POI;
  isSelected: boolean;
  onPress: () => void;
  onGetDirections: () => void;
  onImagePress: (imageUrl: string) => void;
  brandColor: string;
}>) {
  const config = POI_CATEGORIES.find((c) => c.key === poi.category);
  const imageUri = poi.photoReference ? photoUrl(poi.photoReference) : null;

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
        {imageUri ? (
          <Pressable
            onPress={() => onImagePress(imageUri)}
            testID={`poi-image-${poi.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Open image of ${poi.name}`}
          >
            <Image
              source={{ uri: imageUri }}
              style={styles.photo}
              resizeMode="cover"
            />
          </Pressable>
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

function Separator() {
  return <View style={styles.separator} />;
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
    const currentSheetIndexRef = useRef(0);
    const lastOpenSheetIndexRef = useRef(0);
    const isSheetOpenRef = useRef(false);

    const insets = useSafeAreaInsets();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    const theme = useCampusTheme(campusTheme);

    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(
      null,
    );

    const pinchScale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    const snapPoints = React.useMemo(() => {
      const collapsed = Math.max(260, Math.round(windowHeight * 0.35));
      const topBuffer = insets.top - 6;
      const expanded = Math.max(300, windowHeight - topBuffer);
      return [collapsed, expanded];
    }, [windowHeight, insets.top]);

    useImperativeHandle(ref, () => ({
      expand: () => {
        currentSheetIndexRef.current = 0;
        lastOpenSheetIndexRef.current = 0;
        isSheetOpenRef.current = true;
        sheetRef.current?.snapToIndex(0);
      },
      close: () => {
        currentSheetIndexRef.current = 0;
        isSheetOpenRef.current = false;
        sheetRef.current?.close();
      },
    }));

    useEffect(() => {
      if (status === "idle") {
        sheetRef.current?.close();
        currentSheetIndexRef.current = 0;
        isSheetOpenRef.current = false;
        return;
      }

      if (!isSheetOpenRef.current) {
        const indexToOpen = lastOpenSheetIndexRef.current;
        currentSheetIndexRef.current = indexToOpen;
        isSheetOpenRef.current = true;
        sheetRef.current?.snapToIndex(indexToOpen);
      }
    }, [status]);

    const categoryConfig = POI_CATEGORIES.find((c) => c.key === activeCategory);

    const openImageViewer = useCallback(
      (imageUrl: string) => {
        setSelectedImageUri(imageUrl);
        setImageViewerVisible(true);
        pinchScale.value = 1;
        savedScale.value = 1;
      },
      [pinchScale, savedScale],
    );

    const closeImageViewer = useCallback(() => {
      setImageViewerVisible(false);
      setSelectedImageUri(null);
      pinchScale.value = 1;
      savedScale.value = 1;
    }, [pinchScale, savedScale]);

    const pinchGesture = Gesture.Pinch()
      .onUpdate((event) => {
        pinchScale.value = Math.max(
          1,
          Math.min(savedScale.value * event.scale, 4),
        );
      })
      .onEnd(() => {
        savedScale.value = pinchScale.value;
      });

    const animatedImageStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: pinchScale.value }],
      };
    });

    const Handle = useCallback(
      (_props: BottomSheetHandleProps) => (
        <View style={styles.handleWrap}>
          <Pressable
            onPress={() => {
              currentSheetIndexRef.current = 1;
              lastOpenSheetIndexRef.current = 1;
              isSheetOpenRef.current = true;
              sheetRef.current?.snapToIndex(1);
            }}
            style={styles.handleTapArea}
            testID="poiSheet-handle"
          >
            <View style={styles.handleIndicator} />
          </Pressable>

          <Pressable
            onPress={() => {
              currentSheetIndexRef.current = 0;
              isSheetOpenRef.current = false;
              onClose();
            }}
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
      (info: { item: POI }) => {
        const poi = info.item;

        return (
          <POIRow
            poi={poi}
            isSelected={selectedPOI?.id === poi.id}
            onPress={() => onSelectPOI(poi)}
            onGetDirections={() => onGetDirections(poi)}
            onImagePress={openImageViewer}
            brandColor={theme.brand}
          />
        );
      },
      [selectedPOI, onSelectPOI, onGetDirections, openImageViewer, theme.brand],
    );

    const handleRadiusSelect = useCallback(
      (value: number) => {
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

    const headerContent = (
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
            Filter places by distance from the selected campus
          </Text>

          <View
            style={[
              styles.radiusValuePill,
              {
                borderColor: theme.border,
                backgroundColor: theme.closeBg,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="tune-variant"
              size={16}
              color={theme.brand}
            />
            <Text style={[styles.radiusValueText, { color: theme.brand }]}>
              {formatRadiusLabel(radius)}
            </Text>
          </View>

          <View style={styles.sliderWrap}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1000}
              step={100}
              value={radius}
              onSlidingComplete={(value) => handleRadiusSelect(value)}
              minimumTrackTintColor={theme.brand}
              maximumTrackTintColor="#D8D8D8"
              thumbTintColor={theme.brand}
              accessibilityLabel="POI radius slider"
            />

            <View style={styles.sliderLabels}>
              {Array.from({ length: 11 }, (_, i) => i * 100).map((value) => (
                <Text
                  key={value}
                  style={[
                    styles.sliderLabel,
                    value === radius && {
                      color: theme.brand,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {value === 1000 ? "1k" : value}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </View>
    );

    return (
      <>
        <BottomSheet
          ref={sheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          onClose={() => {
            currentSheetIndexRef.current = 0;
            isSheetOpenRef.current = false;
            onClose();
          }}
          onChange={(index) => {
            if (index >= 0) {
              currentSheetIndexRef.current = index;
              lastOpenSheetIndexRef.current = index;
              isSheetOpenRef.current = true;
            } else {
              isSheetOpenRef.current = false;
            }
            onSheetChange?.(index);
          }}
          handleComponent={Handle}
          topInset={Math.max(0, insets.top - 6)}
          backgroundStyle={[
            styles.sheetBackground,
            { borderColor: theme.border },
          ]}
        >
          <View style={styles.sheetContent}>
            {headerContent}
            <View style={styles.sheetBody}>{renderContent()}</View>
          </View>
        </BottomSheet>

        <Modal
          visible={imageViewerVisible}
          transparent
          animationType="fade"
          onRequestClose={closeImageViewer}
        >
          <View style={styles.modalOverlay}>
            <GestureDetector gesture={pinchGesture}>
              <Pressable
                style={styles.fullscreenImageTapArea}
                onPress={closeImageViewer}
                accessibilityRole="button"
                accessibilityLabel="Close image overlay"
              >
                {selectedImageUri ? (
                  <Animated.Image
                    source={{ uri: selectedImageUri }}
                    resizeMode="contain"
                    style={[
                      styles.fullscreenImage,
                      {
                        width: windowWidth * 0.9,
                        height: windowHeight * 0.7,
                      },
                      animatedImageStyle,
                    ]}
                  />
                ) : null}
              </Pressable>
            </GestureDetector>
          </View>
        </Modal>
      </>
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
  sheetContent: {
    flex: 1,
  },
  sheetBody: {
    flex: 1,
  },
  ...bottomSheetStyle,

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
  radiusValuePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
    marginBottom: 10,
  },
  radiusValueText: {
    fontSize: 15,
    fontWeight: "700",
  },
  sliderWrap: {
    width: "100%",
    paddingHorizontal: 0,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
    paddingHorizontal: 12,
  },
  sliderLabel: {
    fontSize: 10,
    color: "rgba(17,17,17,0.55)",
  },

  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.07)",
    marginVertical: 2,
  },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  fullscreenImageTapArea: {
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    borderRadius: 14,
  },
});
