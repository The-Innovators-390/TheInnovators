/* eslint-disable import/first */
import { describe, it, expect, beforeEach, jest } from "@jest/globals";

const mockIsPointInPolygon = jest.fn();

jest.mock("@/components/campus/helper_methods/pointInPolygon", () => ({
  isPointInPolygon: (...args: any[]) => mockIsPointInPolygon(...args),
}));

import {
  buildAllBuildings,
  getBuildingContainingPoint,
  getNearestBuilding,
  resolveCampusFromLocation,
  getUserLocationBuildingId,
  makeUserLocationBuilding,
} from "@/components/campus/helper_methods/campusMap.buildings";

describe("campusMap.buildings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const B1: any = {
    id: "H",
    campus: "SGW",
    code: "H",
    name: "Hall",
    latitude: 45.49729,
    longitude: -73.57898,
    polygon: [{ latitude: 1, longitude: 1 }],
  };

  const B2: any = {
    id: "MB",
    campus: "SGW",
    code: "MB",
    name: "Molson",
    latitude: 45.4978,
    longitude: -73.5795,
    polygon: [{ latitude: 2, longitude: 2 }],
  };

  it("buildAllBuildings merges SGW and LOY arrays", () => {
    expect(buildAllBuildings([B1], [B2])).toEqual([B1, B2]);
  });

  it("getBuildingContainingPoint returns the building containing the point", () => {
    mockIsPointInPolygon.mockImplementation((_pt: any, polygon: any[]) => {
      return polygon === B2.polygon;
    });

    const result = getBuildingContainingPoint([B1, B2], 10, 20);

    expect(result).toBe(B2);
    expect(mockIsPointInPolygon).toHaveBeenCalled();
  });

  it("getBuildingContainingPoint skips buildings with empty polygons", () => {
    const noPolygon: any = {
      id: "X",
      campus: "SGW",
      code: "X",
      name: "No Polygon",
      latitude: 0,
      longitude: 0,
      polygon: [],
    };

    mockIsPointInPolygon.mockReturnValue(true);

    const result = getBuildingContainingPoint([noPolygon, B1], 10, 20);

    expect(result).toBe(B1);
    expect(mockIsPointInPolygon).toHaveBeenCalledTimes(1);
  });

  it("getBuildingContainingPoint returns undefined when no building matches", () => {
    mockIsPointInPolygon.mockReturnValue(false);

    expect(getBuildingContainingPoint([B1, B2], 10, 20)).toBeUndefined();
  });

  it("getNearestBuilding returns undefined when buildings array is empty", () => {
    expect(getNearestBuilding([], 45.5, -73.6)).toBeUndefined();
  });

  it("getNearestBuilding returns the closest building", () => {
    const near: any = {
      id: "AD",
      campus: "LOY",
      code: "AD",
      name: "Administration",
      latitude: 45.458,
      longitude: -73.64,
      polygon: [],
    };

    const far: any = {
      id: "H",
      campus: "SGW",
      code: "H",
      name: "Hall",
      latitude: 45.49729,
      longitude: -73.57898,
      polygon: [],
    };

    const result = getNearestBuilding([far, near], 45.4581, -73.6401);

    expect(result).toBe(near);
  });

  it("resolveCampusFromLocation returns containing building campus first", () => {
    mockIsPointInPolygon.mockImplementation((_pt: any, polygon: any[]) => {
      return polygon === B1.polygon;
    });

    const result = resolveCampusFromLocation([B1, B2], 45.5, -73.6);

    expect(result).toBe("SGW");
  });

  it("resolveCampusFromLocation falls back to nearest building campus", () => {
    mockIsPointInPolygon.mockReturnValue(false);

    const loy: any = {
      id: "AD",
      campus: "LOY",
      code: "AD",
      name: "Administration",
      latitude: 45.458,
      longitude: -73.64,
      polygon: [],
    };

    const sgw: any = {
      id: "H",
      campus: "SGW",
      code: "H",
      name: "Hall",
      latitude: 45.49729,
      longitude: -73.57898,
      polygon: [],
    };

    const result = resolveCampusFromLocation([sgw, loy], 45.45805, -73.64005);

    expect(result).toBe("LOY");
  });

  it("resolveCampusFromLocation returns null when no buildings exist", () => {
    mockIsPointInPolygon.mockReturnValue(false);

    expect(resolveCampusFromLocation([], 45.5, -73.6)).toBeNull();
  });

  it("getUserLocationBuildingId returns null when userLocation is null", () => {
    expect(getUserLocationBuildingId([B1], null)).toBeNull();
  });

  it("getUserLocationBuildingId returns the building id when user is inside a building", () => {
    mockIsPointInPolygon.mockReturnValue(true);

    expect(getUserLocationBuildingId([B1], { latitude: 1, longitude: 2 })).toBe(
      "H",
    );
  });

  it("getUserLocationBuildingId returns null when user is not inside any building", () => {
    mockIsPointInPolygon.mockReturnValue(false);

    expect(
      getUserLocationBuildingId([B1], { latitude: 1, longitude: 2 }),
    ).toBeNull();
  });

  it("makeUserLocationBuilding returns the expected user location building object", () => {
    const result = makeUserLocationBuilding(45.5, -73.6, "SGW");

    expect(result).toMatchObject({
      id: "USER_LOCATION",
      campus: "SGW",
      code: "",
      name: "Your location",
      address: "",
      latitude: 45.5,
      longitude: -73.6,
      aliases: [],
      polygon: [],
      zoomCategory: 2,
    });
  });
});
