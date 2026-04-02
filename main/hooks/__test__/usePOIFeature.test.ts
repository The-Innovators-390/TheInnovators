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

  it("returns state from usePOISearch", () => {
    mockedUsePOISearch.mockReturnValueOnce({
      pois: [mockPOI],
      status: "success",
      selectedPOI: mockPOI,
      setSelectedPOI: mockSetSelectedPOI,
      activeCategory: "cafe",
      setActiveCategory: mockSetActiveCategory,
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
  });
});
