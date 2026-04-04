import {
  POI_CATEGORIES,
  type POI,
  type POICategory,
  type POICategoryConfig,
} from "@/components/POI/types";

describe("POI types and constants", () => {
  it("contains all expected POI categories in the correct order", () => {
    const keys = POI_CATEGORIES.map((category) => category.key);

    expect(keys).toEqual(["restaurant", "cafe", "gym", "parking", "library"]);
  });

  it("has valid labels, icons, emojis, and place types for each category", () => {
    expect(POI_CATEGORIES).toEqual([
      {
        key: "restaurant",
        label: "Restaurants",
        iconName: "silverware-fork-knife",
        emoji: "🍴",
        placeType: "restaurant",
      },
      {
        key: "cafe",
        label: "Coffee",
        iconName: "coffee",
        emoji: "☕",
        placeType: "cafe",
      },
      {
        key: "gym",
        label: "Gym",
        iconName: "dumbbell",
        emoji: "🏋️",
        placeType: "gym",
      },
      {
        key: "parking",
        label: "Parking",
        iconName: "parking",
        emoji: "🅿️",
        placeType: "parking",
      },
      {
        key: "library",
        label: "Library",
        iconName: "bookshelf",
        emoji: "📚",
        placeType: "library",
      },
    ]);
  });

  it("has unique category keys", () => {
    const keys = POI_CATEGORIES.map((category) => category.key);
    const uniqueKeys = new Set(keys);

    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("has unique place types", () => {
    const placeTypes = POI_CATEGORIES.map((category) => category.placeType);
    const uniquePlaceTypes = new Set(placeTypes);

    expect(uniquePlaceTypes.size).toBe(placeTypes.length);
  });

  it("ensures every category object has all required fields", () => {
    POI_CATEGORIES.forEach((category) => {
      expect(category).toHaveProperty("key");
      expect(category).toHaveProperty("label");
      expect(category).toHaveProperty("iconName");
      expect(category).toHaveProperty("emoji");
      expect(category).toHaveProperty("placeType");

      expect(typeof category.key).toBe("string");
      expect(typeof category.label).toBe("string");
      expect(typeof category.iconName).toBe("string");
      expect(typeof category.emoji).toBe("string");
      expect(typeof category.placeType).toBe("string");
    });
  });

  it("allows a valid POI object shape", () => {
    const poi: POI = {
      id: "poi-1",
      name: "Van Houtte",
      category: "cafe",
      latitude: 45.4971,
      longitude: -73.5788,
      address: "1455 De Maisonneuve Blvd W",
      distance: 120,
      photoReference: "sample-photo-ref",
      openNow: true,
      rating: 4.3,
    };

    expect(poi.id).toBe("poi-1");
    expect(poi.name).toBe("Van Houtte");
    expect(poi.category).toBe("cafe");
    expect(poi.latitude).toBeCloseTo(45.4971);
    expect(poi.longitude).toBeCloseTo(-73.5788);
    expect(poi.address).toBe("1455 De Maisonneuve Blvd W");
    expect(poi.distance).toBe(120);
    expect(poi.photoReference).toBe("sample-photo-ref");
    expect(poi.openNow).toBe(true);
    expect(poi.rating).toBe(4.3);
  });

  it("allows a minimal POI object shape with only required fields", () => {
    const poi: POI = {
      id: "poi-2",
      name: "Hall Building Parking",
      category: "parking",
      latitude: 45.4975,
      longitude: -73.5791,
    };

    expect(poi).toEqual({
      id: "poi-2",
      name: "Hall Building Parking",
      category: "parking",
      latitude: 45.4975,
      longitude: -73.5791,
    });
  });

  it("supports valid POICategory values", () => {
    const categories: POICategory[] = [
      "restaurant",
      "cafe",
      "gym",
      "parking",
      "library",
    ];

    expect(categories).toHaveLength(5);
    expect(categories).toContain("library");
    expect(categories).toContain("restaurant");
  });

  it("supports a valid POICategoryConfig shape", () => {
    const config: POICategoryConfig = {
      key: "library",
      label: "Library",
      iconName: "bookshelf",
      emoji: "📚",
      placeType: "library",
    };

    expect(config.key).toBe("library");
    expect(config.label).toBe("Library");
    expect(config.iconName).toBe("bookshelf");
    expect(config.emoji).toBe("📚");
    expect(config.placeType).toBe("library");
  });
});
