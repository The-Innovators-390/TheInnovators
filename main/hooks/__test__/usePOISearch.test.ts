import { renderHook, act, waitFor } from "@testing-library/react-native";
import { usePOISearch } from "../usePOISearch";

describe("usePOISearch", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("starts with the correct initial state", () => {
    const { result } = renderHook(() => usePOISearch());

    expect(result.current.pois).toEqual([]);
    expect(result.current.status).toBe("idle");
    expect(result.current.selectedPOI).toBeNull();
    expect(result.current.activeCategory).toBeNull();
  });

  it("searches POIs successfully and maps the results", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: "OK",
        results: [
          {
            place_id: "2",
            name: "Far Cafe",
            geometry: {
              location: { lat: 45.498, lng: -73.58 },
            },
            vicinity: "456 Far St",
            rating: 4.1,
            opening_hours: { open_now: false },
            photos: [{ photo_reference: "photo-2" }],
          },
          {
            place_id: "1",
            name: "Near Cafe",
            geometry: {
              location: { lat: 45.4973, lng: -73.5786 },
            },
            vicinity: "123 Near St",
            rating: 4.8,
            opening_hours: { open_now: true },
            photos: [{ photo_reference: "photo-1" }],
          },
        ],
      }),
    });

    const { result } = renderHook(() => usePOISearch());

    await act(async () => {
      await result.current.searchPOIs("cafe", 45.4972, -73.5785);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain("type=cafe");

    expect(result.current.pois).toHaveLength(2);
    expect(result.current.pois[0]).toMatchObject({
      id: "1",
      name: "Near Cafe",
      category: "cafe",
      latitude: 45.4973,
      longitude: -73.5786,
      address: "123 Near St",
      photoReference: "photo-1",
      openNow: true,
      rating: 4.8,
    });

    expect(result.current.pois[1]).toMatchObject({
      id: "2",
      name: "Far Cafe",
      category: "cafe",
      latitude: 45.498,
      longitude: -73.58,
      address: "456 Far St",
      photoReference: "photo-2",
      openNow: false,
      rating: 4.1,
    });

    expect(result.current.pois[0].distance ?? 0).toBeLessThan(
      result.current.pois[1].distance ?? 0,
    );
  });

  it("sets no_results when the API returns ZERO_RESULTS", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: "ZERO_RESULTS",
        results: [],
      }),
    });

    const { result } = renderHook(() => usePOISearch());

    await act(async () => {
      await result.current.searchPOIs("restaurant", 45.4972, -73.5785);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("no_results");
    });

    expect(result.current.pois).toEqual([]);
  });

  it("sets no_results when results are empty", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: "OK",
        results: [],
      }),
    });

    const { result } = renderHook(() => usePOISearch());

    await act(async () => {
      await result.current.searchPOIs("library", 45.4972, -73.5785);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("no_results");
    });

    expect(result.current.pois).toEqual([]);
  });

  it("sets error when the API returns a non-OK status", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: "REQUEST_DENIED",
        error_message: "Invalid API key",
      }),
    });

    const { result } = renderHook(() => usePOISearch());

    await act(async () => {
      await result.current.searchPOIs("gym", 45.4972, -73.5785);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(result.current.pois).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("sets error when fetch rejects", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePOISearch());

    await act(async () => {
      await result.current.searchPOIs("parking", 45.4972, -73.5785);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it("clearPOIs resets the state", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        status: "OK",
        results: [
          {
            place_id: "1",
            name: "Test Library",
            geometry: {
              location: { lat: 45.4973, lng: -73.5786 },
            },
            vicinity: "123 Test St",
          },
        ],
      }),
    });

    const { result } = renderHook(() => usePOISearch());

    act(() => {
      result.current.setActiveCategory("library");
      result.current.setSelectedPOI({
        id: "1",
        name: "Test Library",
        category: "library",
        latitude: 45.4973,
        longitude: -73.5786,
        address: "123 Test St",
      });
    });

    await act(async () => {
      await result.current.searchPOIs("library", 45.4972, -73.5785);
    });

    act(() => {
      result.current.clearPOIs();
    });

    expect(result.current.pois).toEqual([]);
    expect(result.current.status).toBe("idle");
    expect(result.current.selectedPOI).toBeNull();
    expect(result.current.activeCategory).toBeNull();
  });
});
