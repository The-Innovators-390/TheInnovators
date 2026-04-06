import type { TravelMode } from "./googleDirections";
import {
  DrivingStrategy,
  WalkingStrategy,
  TransitStrategy,
  BicyclingStrategy,
  type RouteStrategy,
} from "./routeStrategy";

type StrategyCreator = () => RouteStrategy;

export class RouteStrategyFactory {
  private static readonly registry: Partial<
    Record<TravelMode, StrategyCreator>
  > = {
    driving: () => new DrivingStrategy(),
    walking: () => new WalkingStrategy(),
    transit: () => new TransitStrategy(),
    bicycling: () => new BicyclingStrategy(),
  };

  static create(mode: TravelMode): RouteStrategy {
    const creator = this.registry[mode];

    if (!creator) {
      throw new Error(`Unsupported travel mode: ${mode}`);
    }

    return creator();
  }

  static register(mode: TravelMode, creator: StrategyCreator): void {
    this.registry[mode] = creator;
  }
}
