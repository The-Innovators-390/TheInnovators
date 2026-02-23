/* eslint-env jest */
/* global jest */
import "@testing-library/jest-native/extend-expect";

// Mock useUserRole globally so any component that imports it (e.g. CampusMap)
// doesn't attempt to load firebase/auth ESM in Jest.
jest.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "visitor", loading: false }),
  isShuttleEligible: (role) => role === "student" || role === "staff",
}));

// alert() is not defined in React Native's Jest environment.
global.alert = jest.fn();

// Fix: "No safe area value available"
import mockSafeAreaContext from "react-native-safe-area-context/jest/mock";
jest.mock("react-native-safe-area-context", () => mockSafeAreaContext);

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View, ScrollView } = require("react-native");

  const BottomSheet = React.forwardRef(({ children }, ref) => (
    <View ref={ref}>{children}</View>
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

// Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
}));

/**
 * Mock expo-linear-gradient
 */
jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const PropTypes = require("prop-types");
  const { View } = require("react-native");

  function LinearGradient({ children, ...props }) {
    return React.createElement(View, props, children);
  }

  LinearGradient.propTypes = {
    children: PropTypes.node,
  };

  return { LinearGradient };
});

/**
 * Mock react-native-maps
 * Expose animateToRegion as a stable spy so tests can assert calls.
 */
globalThis.__animateToRegionMock = jest.fn();

jest.mock("react-native-maps", () => {
  const React = require("react");
  const PropTypes = require("prop-types");
  const { View } = require("react-native");

  const MockMapView = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: globalThis.__animateToRegionMock,
    }));

    // IMPORTANT: render children so <Polygon /> etc appear in the tree
    return React.createElement(View, props, props.children);
  });

  MockMapView.displayName = "MockMapView";
  MockMapView.propTypes = {
    children: PropTypes.node,
  };

  const MockPolygon = (props) =>
    React.createElement(View, props, props.children);
  MockPolygon.propTypes = {
    children: PropTypes.node,
  };

  const MockMarker = (props) =>
    React.createElement(View, props, props.children);
  MockMarker.propTypes = {
    children: PropTypes.node,
  };

  return {
    __esModule: true,
    default: MockMapView,
    PROVIDER_GOOGLE: "google",
    Polygon: MockPolygon,
    Marker: MockMarker,
  };
});
