/* eslint-env jest */
/* global jest */
/* eslint-disable react/prop-types */
import "@testing-library/jest-native/extend-expect";

// Mock useUserRole globally so any component that imports it (e.g. CampusMap)
// doesn't attempt to load firebase/auth ESM in Jest.
jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "visitor", loading: false }),
  isShuttleEligible: (role) => role === "student" || role === "staff",
}));

// alert() is not defined in React Native's Jest environment.
globalThis.alert = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Fix: "No safe area value available"
import mockSafeAreaContext from "react-native-safe-area-context/jest/mock";
jest.mock("react-native-safe-area-context", () => mockSafeAreaContext);

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View, ScrollView } = require("react-native");

  const BottomSheet = React.forwardRef(({ children, ...props }, ref) => (
    <View ref={ref} {...props}>
      {children}
    </View>
  ));

  const BottomSheetScrollView = ({ children, ...props }) => (
    <ScrollView {...props}>{children}</ScrollView>
  );

  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetScrollView,
  };
});

// Mock expo-router (hooks + imperative API; per-file jest.mock may replace this module)
const mockExpoRouterApi = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  setParams: jest.fn(),
};

jest.mock("expo-router", () => ({
  __esModule: true,
  router: mockExpoRouterApi,
  /** Stable object identity so CampusMap URL-clear effects do not loop on every render. */
  useRouter: () => mockExpoRouterApi,
  useLocalSearchParams: jest.fn(() => ({})),
}));

/**
 * Mock expo-linear-gradient
 */
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");

  function LinearGradient(componentProps) {
    return React.createElement(View, componentProps, componentProps.children);
  }

  return { LinearGradient };
});

/**
 * Mock react-native-maps
 * Expose animateToRegion as a stable spy so tests can assert calls.
 */
globalThis.__animateToRegionMock = jest.fn();

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockMapView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: globalThis.__animateToRegionMock,
    }));

    // IMPORTANT: render children so <Polygon /> etc appear in the tree
    return React.createElement(View, props, props.children);
  });

  MockMapView.displayName = "MockMapView";

  const MockPolygon = (componentProps) =>
    React.createElement(View, componentProps, componentProps.children);

  const MockMarker = (componentProps) =>
    React.createElement(View, componentProps, componentProps.children);

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Polygon: MockPolygon,
    Marker: MockMarker,
  };
});
