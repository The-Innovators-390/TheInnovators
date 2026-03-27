import { describe, it, expect, jest } from "@jest/globals";
import { resetMapDirectionToNorth } from "../helper_methods/mapCompass";

describe("resetMapDirectionToNorth", () => {
  it("does nothing when mapRef.current is null", () => {
    const mapRef = { current: null };

    expect(() => resetMapDirectionToNorth(mapRef as any, 500)).not.toThrow();
  });

  it("does nothing when getCamera is missing", () => {
    const mapRef = {
      current: {},
    };

    expect(() => resetMapDirectionToNorth(mapRef as any, 500)).toThrow(
      "map.getCamera is not a function",
    );
  });

  it("animates camera to north with default duration when no duration is provided", async () => {
    const animateCamera = jest.fn();
    const getCamera = jest.fn().mockResolvedValue({
      center: { latitude: 45.497, longitude: -73.579 },
      heading: 123,
      pitch: 10,
      zoom: 15,
    });

    const mapRef = {
      current: {
        getCamera,
        animateCamera,
      },
    };

    resetMapDirectionToNorth(mapRef as any);

    await Promise.resolve();

    expect(getCamera).toHaveBeenCalledTimes(1);
    expect(animateCamera).toHaveBeenCalledTimes(1);
    expect(animateCamera).toHaveBeenCalledWith(
      {
        center: { latitude: 45.497, longitude: -73.579 },
        heading: 0,
        pitch: 10,
        zoom: 15,
      },
      { duration: 350 },
    );
  });

  it("animates camera to north with provided duration", async () => {
    const animateCamera = jest.fn();
    const getCamera = jest.fn().mockResolvedValue({
      center: { latitude: 45.5, longitude: -73.5 },
      heading: 80,
      pitch: 0,
      altitude: 1000,
    });

    const mapRef = {
      current: {
        getCamera,
        animateCamera,
      },
    };

    resetMapDirectionToNorth(mapRef as any, 500);

    await Promise.resolve();

    expect(getCamera).toHaveBeenCalledTimes(1);
    expect(animateCamera).toHaveBeenCalledTimes(1);
    expect(animateCamera).toHaveBeenCalledWith(
      {
        center: { latitude: 45.5, longitude: -73.5 },
        heading: 0,
        pitch: 0,
        altitude: 1000,
      },
      { duration: 500 },
    );
  });
});
