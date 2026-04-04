import { RouteStrategyFactory } from "../helper_methods/RouteStrategyFactory";
import {
    BicyclingStrategy,
    DrivingStrategy,
    TransitStrategy,
    WalkingStrategy,
} from "../helper_methods/routeStrategy";

describe("RouteStrategyFactory.ts", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("creates DrivingStrategy for driving mode", () => {
        expect(RouteStrategyFactory.create("driving")).toBeInstanceOf(
            DrivingStrategy,
        );
    });

    it("creates WalkingStrategy for walking mode", () => {
        expect(RouteStrategyFactory.create("walking")).toBeInstanceOf(
            WalkingStrategy,
        );
    });

    it("creates TransitStrategy for transit mode", () => {
        expect(RouteStrategyFactory.create("transit")).toBeInstanceOf(
            TransitStrategy,
        );
    });

    it("creates BicyclingStrategy for bicycling mode", () => {
        expect(RouteStrategyFactory.create("bicycling")).toBeInstanceOf(
            BicyclingStrategy,
        );
    });

    it("throws for shuttle because it is not registered", () => {
        expect(() => RouteStrategyFactory.create("shuttle")).toThrow(
            "Unsupported travel mode: shuttle",
        );
    });

    it("throws for unsupported travel mode", () => {
        expect(() => RouteStrategyFactory.create("teleport" as any)).toThrow(
            "Unsupported travel mode: teleport",
        );
    });

    it("can register a custom strategy", () => {
        class CustomWalkingStrategy extends WalkingStrategy { }

        RouteStrategyFactory.register("walking", () => new CustomWalkingStrategy());

        expect(RouteStrategyFactory.create("walking")).toBeInstanceOf(
            CustomWalkingStrategy,
        );
    });
});