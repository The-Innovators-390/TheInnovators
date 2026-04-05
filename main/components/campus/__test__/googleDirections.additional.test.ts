import type {
  DirectionRoute,
  LatLng,
} from "../helper_methods/googleDirections";
import {
  fetchDirections,
  pickFastestRoute,
} from "../helper_methods/googleDirections";

describe("googleDirections.additional", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws for shuttle mode because it is not registered in the factory", async () => {
    const origin: LatLng = { latitude: 1, longitude: 2 };
    const destination: LatLng = { latitude: 3, longitude: 4 };

    await expect(
      fetchDirections({
        origin,
        destination,
        mode: "shuttle",
      }),
    ).rejects.toThrow("Unsupported travel mode: shuttle");
  });

  it("pickFastestRoute returns the same first route object when it includes segmentPolylines", () => {
    const first: DirectionRoute = {
      summary: "Shuttle",
      polyline: "poly-1",
      durationSec: 500,
      durationText: "8 min",
      distanceMeters: 1000,
      distanceText: "1 km",
      segmentPolylines: {
        walkToStop: "a",
        shuttle: "b",
        walkToDestination: "c",
      },
    };

    const second: DirectionRoute = {
      summary: "Another Route",
      polyline: "poly-2",
      durationSec: 800,
      durationText: "13 min",
      distanceMeters: 1500,
      distanceText: "1.5 km",
    };

    const picked = pickFastestRoute([first, second]);

    expect(picked).toBe(first);
    expect(picked?.segmentPolylines).toEqual(first.segmentPolylines);
  });
});
