import { renderHook, act } from "@testing-library/react-native";
import { usePOIDirections } from "@/hooks/usePOIDirections";
import type { POI } from "@/components/POI/types";

describe("usePOIDirections", () => {
  const poi: POI = {
    id: "poi-1",
    name: "Tim Hortons",
    category: "cafe",
    latitude: 45.497,
    longitude: -73.579,
    address: "1455 De Maisonneuve Blvd W",
  };

  const createProps = (overrides = {}) => ({
    focusedCampus: "SGW" as const,
    isRouteMode: false,
    toggleRouteMode: jest.fn(),
    setRouteStart: jest.fn(),
    setRouteDest: jest.fn(),
    setStartText: jest.fn(),
    setDestText: jest.fn(),
    userLocation: null as { latitude: number; longitude: number } | null,
    setStartToCurrentLocation: jest.fn().mockResolvedValue(undefined),
    closePOISheet: jest.fn(),
    setPoiSheetIndex: jest.fn(),
    setQuery: jest.fn(),
    ...overrides,
  });

  it("toggles route mode and sets POI destination when route mode is off", async () => {
    const props = createProps();

    const { result } = renderHook(() => usePOIDirections(props));

    await act(async () => {
      await result.current.handlePOIGetDirections(poi);
    });

    expect(props.toggleRouteMode).toHaveBeenCalledTimes(1);
    expect(props.setRouteDest).toHaveBeenCalledWith({
      id: "POI-poi-1",
      name: "Tim Hortons",
      code: "",
      address: "1455 De Maisonneuve Blvd W",
      latitude: 45.497,
      longitude: -73.579,
      campus: "SGW",
      aliases: [],
      polygon: [],
      zoomCategory: 2,
    });
    expect(props.setDestText).toHaveBeenCalledWith("Tim Hortons");
    expect(props.setStartToCurrentLocation).toHaveBeenCalledTimes(1);
    expect(props.closePOISheet).toHaveBeenCalledTimes(1);
    expect(props.setPoiSheetIndex).toHaveBeenCalledWith(-1);
    expect(props.setQuery).toHaveBeenCalledWith("");
  });

  it("does not toggle route mode when already in route mode", async () => {
    const props = createProps({
      focusedCampus: "LOY",
      isRouteMode: true,
    });

    const { result } = renderHook(() => usePOIDirections(props));

    await act(async () => {
      await result.current.handlePOIGetDirections(poi);
    });

    expect(props.toggleRouteMode).not.toHaveBeenCalled();
    expect(props.setRouteDest).toHaveBeenCalledWith({
      id: "POI-poi-1",
      name: "Tim Hortons",
      code: "",
      address: "1455 De Maisonneuve Blvd W",
      latitude: 45.497,
      longitude: -73.579,
      campus: "LOY",
      aliases: [],
      polygon: [],
      zoomCategory: 2,
    });
    expect(props.setDestText).toHaveBeenCalledWith("Tim Hortons");
    expect(props.setStartToCurrentLocation).toHaveBeenCalledTimes(1);
    expect(props.closePOISheet).toHaveBeenCalledTimes(1);
    expect(props.setPoiSheetIndex).toHaveBeenCalledWith(-1);
    expect(props.setQuery).toHaveBeenCalledWith("");
  });

  it("uses an empty string when the POI address is missing", async () => {
    const props = createProps({
      isRouteMode: true,
    });

    const poiWithoutAddress: POI = {
      id: "poi-2",
      name: "Library",
      category: "cafe",
      latitude: 45.495,
      longitude: -73.578,
    };

    const { result } = renderHook(() => usePOIDirections(props));

    await act(async () => {
      await result.current.handlePOIGetDirections(poiWithoutAddress);
    });

    expect(props.setRouteDest).toHaveBeenCalledWith({
      id: "POI-poi-2",
      name: "Library",
      code: "",
      address: "",
      latitude: 45.495,
      longitude: -73.578,
      campus: "SGW",
      aliases: [],
      polygon: [],
      zoomCategory: 2,
    });
  });

  it("uses current user location as route start when available", async () => {
    const props = createProps({
      userLocation: { latitude: 45.5, longitude: -73.6 },
    });

    const { result } = renderHook(() => usePOIDirections(props));

    await act(async () => {
      await result.current.handlePOIGetDirections(poi);
    });

    expect(props.setRouteStart).toHaveBeenCalledWith({
      id: "USER_LOCATION",
      name: "Your location",
      code: "",
      address: "",
      latitude: 45.5,
      longitude: -73.6,
      campus: "SGW",
      aliases: [],
      polygon: [],
      zoomCategory: 2,
    });
    expect(props.setStartText).toHaveBeenCalledWith("Your location");
    expect(props.setStartToCurrentLocation).not.toHaveBeenCalled();
  });
});
