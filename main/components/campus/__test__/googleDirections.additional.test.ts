import type {
    DirectionRoute,
    LatLng,
} from "../helper_methods/googleDirections";
import {
    fetchDirections,
    pickFastestRoute,
} from "../helper_methods/googleDirections";
import { getRouteStrategy } from "../helper_methods/routeStrategy";

jest.mock("../helper_methods/routeStrategy", () => ({
    getRouteStrategy: jest.fn(),
}));

describe("googleDirections.additional", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("delegates shuttle mode to the strategy and preserves segmentPolylines", async () => {
        const origin: LatLng = { latitude: 1, longitude: 2 };
        const destination: LatLng = { latitude: 3, longitude: 4 };

        const shuttleRoute: DirectionRoute = {
            summary: "Concordia Shuttle",
            polyline: "combined-poly",
            durationSec: 1800,
            durationText: "30 min",
            distanceMeters: 2000,
            distanceText: "~2.0 km",
            segmentPolylines: {
                walkToStop: "walk-1",
                shuttle: "ride",
                walkToDestination: "walk-2",
            },
        };

        const fetchRoutes = jest.fn().mockResolvedValue([shuttleRoute]);
        (getRouteStrategy as jest.Mock).mockReturnValue({ fetchRoutes });

        const result = await fetchDirections({
            origin,
            destination,
            mode: "shuttle",
        });

        expect(getRouteStrategy).toHaveBeenCalledWith("shuttle");
        expect(fetchRoutes).toHaveBeenCalledWith(origin, destination);
        expect(result[0].segmentPolylines).toEqual(shuttleRoute.segmentPolylines);
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