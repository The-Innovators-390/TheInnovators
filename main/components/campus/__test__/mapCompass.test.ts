import { describe, it, expect, jest } from "@jest/globals";
import { resetMapDirectionToNorth } from "../helper_methods/mapCompass";

describe("resetMapDirectionToNorth", () => {
  it("does nothing when mapRef.current is null", () => {
    const mapRef = { current: null };

    expect(() =>
      resetMapDirectionToNorth(mapRef as any, {
        latitude: 45.5,
        longitude: -73.5,
      }),
    ).not.toThrow();
  });

  it("does nothing when animateCamera is missing", () => {
    const mapRef = {
      current: {},
    };

    expect(() =>
      resetMapDirectionToNorth(mapRef as any, {
        latitude: 45.5,
        longitude: -73.5,
      }),
    ).not.toThrow();
  });

  it("animates camera to north with provided center and duration", () => {
    const animateCamera = jest.fn();
    const mapRef = {
      current: {
        animateCamera,
      },
    };

    resetMapDirectionToNorth(
      mapRef as any,
      { latitude: 45.497, longitude: -73.579 },
      500,
    );

    expect(animateCamera).toHaveBeenCalledTimes(1);
    expect(animateCamera).toHaveBeenCalledWith(
      {
        center: { latitude: 45.497, longitude: -73.579 },
        heading: 0,
        pitch: 0,
      },
      { duration: 500 },
    );
  });

  it("uses default duration when not provided", () => {
    const animateCamera = jest.fn();
    const mapRef = {
      current: {
        animateCamera,
      },
    };

    resetMapDirectionToNorth(mapRef as any);

    expect(animateCamera).toHaveBeenCalledWith(
      {
        center: undefined,
        heading: 0,
        pitch: 0,
      },
      { duration: 350 },
    );
  });
});
