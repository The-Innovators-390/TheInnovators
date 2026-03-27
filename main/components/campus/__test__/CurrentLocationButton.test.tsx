/* eslint-disable import/first */
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Alert, ActivityIndicator } from "react-native";

// Silence icon rendering in tests
jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

type DeviceLocation = {
  latitude: number;
  longitude: number;
};

// @ts-ignore
const mockGetDeviceLocation: jest.Mock<Promise<DeviceLocation>, []> = jest.fn();

jest.mock("@/components/campus/helper_methods/locationUtils", () => {
  class MockLocationError extends Error {
    code: string;

    constructor(code: string, message?: string) {
      super(message ?? code);
      this.code = code;
    }
  }

  return {
    __esModule: true,
    getDeviceLocation: () => mockGetDeviceLocation(),
    LocationError: MockLocationError,
  };
});

jest.spyOn(Alert, "alert").mockImplementation(() => {});

// Import AFTER mocks
import CurrentLocationButton from "../CurrentLocationButton";
import { LocationError } from "@/components/campus/helper_methods/locationUtils";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CurrentLocationButton", () => {
  it("renders the location button", () => {
    const { getByTestId } = render(
      <CurrentLocationButton onLocationFound={jest.fn()} />,
    );

    expect(getByTestId("currentLocationButton")).toBeTruthy();
  });

  it("has correct accessibility attributes", () => {
    const { getByTestId } = render(
      <CurrentLocationButton onLocationFound={jest.fn()} />,
    );

    const button = getByTestId("currentLocationButton");
    expect(button.props.accessibilityRole).toBe("button");
    expect(button.props.accessibilityLabel).toBe(
      "Center map on current location",
    );
    expect(button.props.accessibilityState).toEqual({ busy: false });
  });

  it("applies custom style when provided", () => {
    const { getByTestId } = render(
      <CurrentLocationButton
        onLocationFound={jest.fn()}
        style={{ bottom: 20 }}
      />,
    );

    const button = getByTestId("currentLocationButton");
    expect(button.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ bottom: 20 })]),
    );
  });

  it("calls getDeviceLocation when pressed", async () => {
    mockGetDeviceLocation.mockResolvedValueOnce({
      latitude: 45.5,
      longitude: -73.6,
    });

    const { getByTestId } = render(
      <CurrentLocationButton onLocationFound={jest.fn()} />,
    );

    fireEvent.press(getByTestId("currentLocationButton"));

    await waitFor(() => {
      expect(mockGetDeviceLocation).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onLocationFound with the resolved location", async () => {
    mockGetDeviceLocation.mockResolvedValueOnce({
      latitude: 45.49,
      longitude: -73.58,
    });

    const onLocationFound = jest.fn();
    const { getByTestId } = render(
      <CurrentLocationButton onLocationFound={onLocationFound} />,
    );

    fireEvent.press(getByTestId("currentLocationButton"));

    await waitFor(() => {
      expect(onLocationFound).toHaveBeenCalledWith({
        latitude: 45.49,
        longitude: -73.58,
      });
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("sets accessibilityState.busy=true while fetching location", async () => {
    let resolveLocation!: (value: DeviceLocation) => void;

    const locationPromise = new Promise<DeviceLocation>((resolve) => {
      resolveLocation = resolve;
    });

    mockGetDeviceLocation.mockReturnValueOnce(locationPromise);

    const { getByTestId, UNSAFE_getByType } = render(
      <CurrentLocationButton onLocationFound={jest.fn()} />,
    );

    expect(
      getByTestId("currentLocationButton").props.accessibilityState,
    ).toEqual({ busy: false });

    fireEvent.press(getByTestId("currentLocationButton"));

    await waitFor(() => {
      expect(
        getByTestId("currentLocationButton").props.accessibilityState,
      ).toEqual({ busy: true });
    });

    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

    resolveLocation({ latitude: 45.5, longitude: -73.6 });

    await waitFor(() => {
      expect(
        getByTestId("currentLocationButton").props.accessibilityState,
      ).toEqual({ busy: false });
    });
  });

  it("shows permission denied alert and calls onPermissionDenied", async () => {
    mockGetDeviceLocation.mockRejectedValueOnce(
      new (LocationError as unknown as typeof Error & {
        new (code: string): Error;
      })("PERMISSION_DENIED") as never,
    );

    const onLocationFound = jest.fn();
    const onPermissionDenied = jest.fn();

    const { getByTestId } = render(
      <CurrentLocationButton
        onLocationFound={onLocationFound}
        onPermissionDenied={onPermissionDenied}
      />,
    );

    fireEvent.press(getByTestId("currentLocationButton"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Location Permission Required",
        "Please enable location services in your device settings to use this feature.",
        [{ text: "OK" }],
      );
    });

    expect(onPermissionDenied).toHaveBeenCalledTimes(1);
    expect(onLocationFound).not.toHaveBeenCalled();
  });

  it("does not call onPermissionDenied when services are off", async () => {
    mockGetDeviceLocation.mockRejectedValueOnce(
      new (LocationError as unknown as typeof Error & {
        new (code: string): Error;
      })("SERVICES_OFF") as never,
    );

    const onLocationFound = jest.fn();
    const onPermissionDenied = jest.fn();

    const { getByTestId } = render(
      <CurrentLocationButton
        onLocationFound={onLocationFound}
        onPermissionDenied={onPermissionDenied}
      />,
    );

    fireEvent.press(getByTestId("currentLocationButton"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Location Services Off",
        "Please enable location services on your device to use this feature.",
        [{ text: "OK" }],
      );
    });

    expect(onPermissionDenied).not.toHaveBeenCalled();
    expect(onLocationFound).not.toHaveBeenCalled();
  });

  it("shows generic alert when location fetch fails with a normal error", async () => {
    mockGetDeviceLocation.mockRejectedValueOnce(
      new Error("Location error") as never,
    );

    const onLocationFound = jest.fn();
    const { getByTestId } = render(
      <CurrentLocationButton onLocationFound={onLocationFound} />,
    );

    fireEvent.press(getByTestId("currentLocationButton"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Location Error",
        "Unable to get your current location. Please try again.",
        [{ text: "OK" }],
      );
    });

    expect(onLocationFound).not.toHaveBeenCalled();
  });

  it("shows generic alert when thrown value is not a LocationError", async () => {
    mockGetDeviceLocation.mockRejectedValueOnce({
      code: "PERMISSION_DENIED",
    } as never);

    const onLocationFound = jest.fn();
    const onPermissionDenied = jest.fn();

    const { getByTestId } = render(
      <CurrentLocationButton
        onLocationFound={onLocationFound}
        onPermissionDenied={onPermissionDenied}
      />,
    );

    fireEvent.press(getByTestId("currentLocationButton"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Location Error",
        "Unable to get your current location. Please try again.",
        [{ text: "OK" }],
      );
    });

    expect(onPermissionDenied).not.toHaveBeenCalled();
    expect(onLocationFound).not.toHaveBeenCalled();
  });
});
