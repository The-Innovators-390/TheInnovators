import { renderHook, act } from "@testing-library/react-native";
import { usePOIFeature } from "../usePOIFeature";
import { usePOISearch } from "@/hooks/usePOISearch";
import type { POI } from "@/components/POI/types";

jest.mock("@/hooks/usePOISearch");

const mockedUsePOISearch = usePOISearch as jest.MockedFunction<
  typeof usePOISearch
>;

describe("usePOIFeature", () => {
  const mockSetSelectedPOI = jest.fn();
  const mockSetActiveCategory = jest.fn();
  const mockSetRadius = jest.fn();
  const mockSearchPOIs = jest.fn();
  const mockClearPOIs = jest.fn();

  const mockPOI: POI = {
    id: "1",
    name: "Test Cafe",
    category: "cafe",
    latitude: 45.497,
    longitude: -73.579,
    address: "123 Test St",
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUsePOISearch.mockReturnValue({
      pois: [],
      status: "idle",
      selectedPOI: null,
      setSelectedPOI: mockSetSelectedPOI,
      activeCategory: null,
      setActiveCategory: mockSetActiveCategory,
      radius: 500,
      setRadius: mockSetRadius,
      searchPOIs: mockSearchPOIs,
      clearPOIs: mockClearPOIs,
    });
  });

  it("clears POIs on mount / campus effect", () => {
    renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    expect(mockClearPOIs).toHaveBeenCalled();
  });

  it("clears POIs when category is deselected", () => {
    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    act(() => {
      result.current.handleCategorySelect(null);
    });

    expect(mockSetActiveCategory).toHaveBeenCalledWith(null);
    expect(mockClearPOIs).toHaveBeenCalled();
    expect(mockSearchPOIs).not.toHaveBeenCalled();
  });

  it("does not clear POIs when category is deselected during loading", () => {
    mockedUsePOISearch.mockReturnValueOnce({
      pois: [],
      status: "loading",
      selectedPOI: null,
      setSelectedPOI: mockSetSelectedPOI,
      activeCategory: "cafe",
      setActiveCategory: mockSetActiveCategory,
      radius: 500,
      setRadius: mockSetRadius,
      searchPOIs: mockSearchPOIs,
      clearPOIs: mockClearPOIs,
    });

    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    act(() => {
      result.current.handleCategorySelect(null);
    });

    expect(mockSetActiveCategory).not.toHaveBeenCalledWith(null);
    expect(mockSearchPOIs).not.toHaveBeenCalled();
    expect(mockClearPOIs).toHaveBeenCalledTimes(1); // only from mount effect
  });

  it("sets active category and searches from SGW campus centre", () => {
    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    act(() => {
      result.current.handleCategorySelect("cafe");
    });

    expect(mockSetActiveCategory).toHaveBeenCalledWith("cafe");
    expect(mockSearchPOIs).toHaveBeenCalledWith("cafe", 45.4972, -73.5785);
  });

  it("sets active category and searches from LOY campus centre", () => {
    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "LOY",
        userLocation: null,
      }),
    );

    act(() => {
      result.current.handleCategorySelect("restaurant");
    });

    expect(mockSetActiveCategory).toHaveBeenCalledWith("restaurant");
    expect(mockSearchPOIs).toHaveBeenCalledWith(
      "restaurant",
      45.4582,
      -73.6405,
    );
  });

  it("prefers user location over campus centre when searching", () => {
    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: { latitude: 45.5, longitude: -73.6 },
      }),
    );

    act(() => {
      result.current.handleCategorySelect("gym");
    });

    expect(mockSearchPOIs).toHaveBeenCalledWith("gym", 45.5, -73.6);
  });

  it("selects a POI", () => {
    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    act(() => {
      result.current.handleSelectPOI(mockPOI);
    });

    expect(mockSetSelectedPOI).toHaveBeenCalledWith(mockPOI);
  });

  it("clears POIs when getting directions", () => {
    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    act(() => {
      result.current.handleGetDirections(mockPOI);
    });

    expect(mockClearPOIs).toHaveBeenCalled();
  });

  it("clears POIs when sheet closes", () => {
    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    act(() => {
      result.current.handleSheetClose();
    });

    expect(mockClearPOIs).toHaveBeenCalled();
  });

  it("updates radius only when there is no active category", () => {
    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    act(() => {
      result.current.handleRadiusChange(800);
    });

    expect(mockSetRadius).toHaveBeenCalledWith(800);
    expect(mockSearchPOIs).not.toHaveBeenCalled();
  });

  it("updates radius and re-searches using campus centre when active category exists", () => {
    mockedUsePOISearch.mockReturnValueOnce({
      pois: [],
      status: "idle",
      selectedPOI: null,
      setSelectedPOI: mockSetSelectedPOI,
      activeCategory: "cafe",
      setActiveCategory: mockSetActiveCategory,
      radius: 500,
      setRadius: mockSetRadius,
      searchPOIs: mockSearchPOIs,
      clearPOIs: mockClearPOIs,
    });

    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    act(() => {
      result.current.handleRadiusChange(900);
    });

    expect(mockSetRadius).toHaveBeenCalledWith(900);
    expect(mockSearchPOIs).toHaveBeenCalledWith("cafe", 45.4972, -73.5785, 900);
  });

  it("updates radius and re-searches using user location when active category exists", () => {
    mockedUsePOISearch.mockReturnValueOnce({
      pois: [],
      status: "idle",
      selectedPOI: null,
      setSelectedPOI: mockSetSelectedPOI,
      activeCategory: "parking",
      setActiveCategory: mockSetActiveCategory,
      radius: 500,
      setRadius: mockSetRadius,
      searchPOIs: mockSearchPOIs,
      clearPOIs: mockClearPOIs,
    });

    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "LOY",
        userLocation: { latitude: 45.456, longitude: -73.642 },
      }),
    );

    act(() => {
      result.current.handleRadiusChange(700);
    });

    expect(mockSetRadius).toHaveBeenCalledWith(700);
    expect(mockSearchPOIs).toHaveBeenCalledWith(
      "parking",
      45.456,
      -73.642,
      700,
    );
  });

  it("returns state from usePOISearch", () => {
    mockedUsePOISearch.mockReturnValueOnce({
      pois: [mockPOI],
      status: "success",
      selectedPOI: mockPOI,
      setSelectedPOI: mockSetSelectedPOI,
      activeCategory: "cafe",
      setActiveCategory: mockSetActiveCategory,
      radius: 650,
      setRadius: mockSetRadius,
      searchPOIs: mockSearchPOIs,
      clearPOIs: mockClearPOIs,
    });

    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    expect(result.current.pois).toEqual([mockPOI]);
    expect(result.current.status).toBe("success");
    expect(result.current.selectedPOI).toEqual(mockPOI);
    expect(result.current.activeCategory).toBe("cafe");
    expect(result.current.radius).toBe(650);
  });

  it("returns a sheet ref", () => {
    const { result } = renderHook(() =>
      usePOIFeature({
        focusedCampus: "SGW",
        userLocation: null,
      }),
    );

    expect(result.current.poiSheetRef).toBeDefined();
    expect(result.current.poiSheetRef.current).toBeNull();
  });
});
