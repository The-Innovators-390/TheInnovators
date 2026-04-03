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

  it("toggles route mode and sets directions state when route mode is off", async () => {
    const toggleRouteMode = jest.fn();
    const setRouteDest = jest.fn();
    const setDestText = jest.fn();
    const setStartToCurrentLocation = jest.fn().mockResolvedValue(undefined);
    const closePOISheet = jest.fn();
    const setPoiSheetIndex = jest.fn();
    const setQuery = jest.fn();

    const { result } = renderHook(() =>
      usePOIDirections({
        focusedCampus: "SGW",
        isRouteMode: false,
        toggleRouteMode,
        setRouteDest,
        setDestText,
        setStartToCurrentLocation,
        closePOISheet,
        setPoiSheetIndex,
        setQuery,
      }),
    );

    await act(async () => {
      await result.current.handlePOIGetDirections(poi);
    });

    expect(toggleRouteMode).toHaveBeenCalledTimes(1);
    expect(setRouteDest).toHaveBeenCalledWith({
      id: "poi-1",
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
    expect(setDestText).toHaveBeenCalledWith("Tim Hortons");
    expect(setStartToCurrentLocation).toHaveBeenCalledTimes(1);
    expect(closePOISheet).toHaveBeenCalledTimes(1);
    expect(setPoiSheetIndex).toHaveBeenCalledWith(-1);
    expect(setQuery).toHaveBeenCalledWith("");
  });

  it("does not toggle route mode when already in route mode", async () => {
    const toggleRouteMode = jest.fn();
    const setRouteDest = jest.fn();
    const setDestText = jest.fn();
    const setStartToCurrentLocation = jest.fn().mockResolvedValue(undefined);
    const closePOISheet = jest.fn();
    const setPoiSheetIndex = jest.fn();
    const setQuery = jest.fn();

    const { result } = renderHook(() =>
      usePOIDirections({
        focusedCampus: "LOY",
        isRouteMode: true,
        toggleRouteMode,
        setRouteDest,
        setDestText,
        setStartToCurrentLocation,
        closePOISheet,
        setPoiSheetIndex,
        setQuery,
      }),
    );

    await act(async () => {
      await result.current.handlePOIGetDirections(poi);
    });

    expect(toggleRouteMode).not.toHaveBeenCalled();
    expect(setRouteDest).toHaveBeenCalledWith({
      id: "poi-1",
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
    expect(setDestText).toHaveBeenCalledWith("Tim Hortons");
    expect(setStartToCurrentLocation).toHaveBeenCalledTimes(1);
    expect(closePOISheet).toHaveBeenCalledTimes(1);
    expect(setPoiSheetIndex).toHaveBeenCalledWith(-1);
    expect(setQuery).toHaveBeenCalledWith("");
  });

  it("uses an empty string when the POI address is missing", async () => {
    const toggleRouteMode = jest.fn();
    const setRouteDest = jest.fn();
    const setDestText = jest.fn();
    const setStartToCurrentLocation = jest.fn().mockResolvedValue(undefined);
    const closePOISheet = jest.fn();
    const setPoiSheetIndex = jest.fn();
    const setQuery = jest.fn();

    const poiWithoutAddress: POI = {
      id: "poi-2",
      name: "Library",
      category: "library",
      latitude: 45.495,
      longitude: -73.578,
    };

    const { result } = renderHook(() =>
      usePOIDirections({
        focusedCampus: "SGW",
        isRouteMode: true,
        toggleRouteMode,
        setRouteDest,
        setDestText,
        setStartToCurrentLocation,
        closePOISheet,
        setPoiSheetIndex,
        setQuery,
      }),
    );

    await act(async () => {
      await result.current.handlePOIGetDirections(poiWithoutAddress);
    });

    expect(setRouteDest).toHaveBeenCalledWith({
      id: "poi-2",
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
});
