jest.mock("@/components/Buildings/search", () => ({
  searchSGWBuildings: jest.fn(),
  searchLoyolaBuildings: jest.fn(),
}));

import {
  pad2,
  parseISO,
  dateKeyFromDate,
  dateKey,
  formatDayHeader,
  formatTimeRange,
  startOfMonth,
  daysInMonth,
  monthTitle,
  parseLocationDetails,
} from "@/services/calendarUtils";

import {
  searchSGWBuildings,
  searchLoyolaBuildings,
} from "@/components/Buildings/search";

describe("calendarUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("date helpers", () => {
    test("pad2", () => {
      expect(pad2(0)).toBe("00");
      expect(pad2(3)).toBe("03");
      expect(pad2(9)).toBe("09");
      expect(pad2(10)).toBe("10");
      expect(pad2(12)).toBe("12");
    });

    test("parseISO", () => {
      expect(parseISO()).toBeNull();
      expect(parseISO("bad")).toBeNull();

      const d = parseISO("2026-02-27T10:30:00.000Z");
      expect(d).toBeInstanceOf(Date);
    });

    test("dateKeyFromDate / dateKey", () => {
      const d = new Date(2026, 1, 7);
      expect(dateKeyFromDate(d)).toBe("2026-02-07");

      expect(dateKey(undefined)).toBe("unknown");
      expect(dateKey("bad")).toBe("unknown");
      expect(dateKey("2026-02-27T12:00:00.000Z")).toMatch(/^2026-02-27$/);
    });

    test("formatDayHeader suffix rules", () => {
      expect(formatDayHeader(new Date(2026, 0, 1))).toContain("1st");
      expect(formatDayHeader(new Date(2026, 0, 2))).toContain("2nd");
      expect(formatDayHeader(new Date(2026, 0, 3))).toContain("3rd");
      expect(formatDayHeader(new Date(2026, 0, 4))).toContain("4th");
      expect(formatDayHeader(new Date(2026, 0, 11))).toContain("11th");
      expect(formatDayHeader(new Date(2026, 0, 12))).toContain("12th");
      expect(formatDayHeader(new Date(2026, 0, 13))).toContain("13th");
      expect(formatDayHeader(new Date(2026, 0, 21))).toContain("21st");
      expect(formatDayHeader(new Date(2026, 0, 22))).toContain("22nd");
      expect(formatDayHeader(new Date(2026, 0, 23))).toContain("23rd");
    });

    test("formatTimeRange returns All day for missing or date-only values", () => {
      expect(formatTimeRange(undefined, undefined)).toBe("All day");
      expect(formatTimeRange("2026-02-27", "2026-02-27")).toBe("All day");
    });

    test("formatTimeRange returns formatted time range", () => {
      const t = formatTimeRange(
        "2026-02-27T13:09:00.000Z",
        "2026-02-27T14:10:00.000Z",
      );
      expect(t).toMatch(/^\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)$/);
    });

    test("formatTimeRange returns All day when one ISO is invalid", () => {
      expect(formatTimeRange("bad", "2026-02-27T14:10:00.000Z")).toBe(
        "All day",
      );
      expect(formatTimeRange("2026-02-27T13:09:00.000Z", "bad")).toBe(
        "All day",
      );
    });

    test("formatTimeRange formats midnight and noon", () => {
      const t = formatTimeRange(
        "2026-02-27T00:00:00.000Z",
        "2026-02-27T12:00:00.000Z",
      );
      expect(t).toMatch(/^\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)$/);
    });

    test("startOfMonth / daysInMonth / monthTitle", () => {
      const s = startOfMonth(new Date(2026, 1, 27));
      expect(s.getDate()).toBe(1);
      expect(s.getMonth()).toBe(1);
      expect(s.getFullYear()).toBe(2026);

      expect(daysInMonth(new Date(2024, 1, 1))).toBe(29);
      expect(daysInMonth(new Date(2026, 1, 1))).toBe(28);

      expect(monthTitle(new Date(2026, 1, 1))).toBe("February 2026");
    });
  });

  describe("parseLocationDetails", () => {
    test("returns empty object for empty or missing locations", () => {
      expect(parseLocationDetails("")).toEqual({});
      expect(parseLocationDetails(undefined)).toEqual({});
      expect(parseLocationDetails("   ")).toEqual({});
    });

    test("parses SGW campus, room, and building", () => {
      (searchSGWBuildings as jest.Mock).mockImplementation((q: string) => {
        if (q.toLowerCase().includes("henry f. hall")) {
          return [{ id: "hall", code: "H", campus: "SGW" }];
        }
        return [];
      });

      const res = parseLocationDetails(
        "SGW Campus - Henry F. Hall Building - Rm 123",
      );

      expect(res.room).toBe("123");
      expect(res.campus).toBe("SGW");
      expect(res.building?.code).toBe("H");
    });

    test("parses Loyola campus, room, and building", () => {
      (searchLoyolaBuildings as jest.Mock).mockImplementation((q: string) => {
        if (q.toLowerCase().includes("renaud")) {
          return [{ id: "sp", code: "SP", campus: "LOY" }];
        }
        return [];
      });

      const res = parseLocationDetails(
        "Loyola Campus - Richard J. Renaud Science Complex - Rm 101",
      );

      expect(res.room).toBe("101");
      expect(res.campus).toBe("LOY");
      expect(res.building?.code).toBe("SP");
    });

    test("detects SGW from sir george wording", () => {
      (searchSGWBuildings as jest.Mock).mockImplementation((q: string) => {
        if (q.toLowerCase().includes("henry f. hall")) {
          return [{ id: "hall", code: "H", campus: "SGW" }];
        }
        return [];
      });

      const res = parseLocationDetails(
        "Sir George Williams Campus - Henry F. Hall Building - Rm 820",
      );

      expect(res.room).toBe("820");
      expect(res.campus).toBe("SGW");
      expect(res.building?.code).toBe("H");
    });

    test("handles lowercase rm marker", () => {
      (searchSGWBuildings as jest.Mock).mockImplementation((q: string) => {
        if (q.toLowerCase().includes("henry f. hall")) {
          return [{ id: "hall", code: "H", campus: "SGW" }];
        }
        return [];
      });

      const res = parseLocationDetails(
        "SGW Campus - Henry F. Hall Building - rm 315",
      );

      expect(res.room).toBe("315");
      expect(res.building?.code).toBe("H");
      expect(res.campus).toBe("SGW");
    });

    test("returns detected campus and room even when building is not found", () => {
      (searchLoyolaBuildings as jest.Mock).mockReturnValue([]);

      const res = parseLocationDetails(
        "Loyola Campus - Some Unknown Place - Rm ABC-123",
      );

      expect(res.room).toBe("ABC-123");
      expect(res.campus).toBe("LOY");
      expect(res.building).toBeUndefined();
    });

    test("uses SGW search when campus is SGW", () => {
      (searchSGWBuildings as jest.Mock).mockImplementation((q: string) => {
        if (q.toLowerCase().includes("john molson")) {
          return [{ id: "mb", code: "MB", campus: "SGW" }];
        }
        return [];
      });

      const res = parseLocationDetails(
        "SGW Campus - John Molson School of Business - Rm 1.101",
      );

      expect(res.building?.code).toBe("MB");
      expect(searchSGWBuildings).toHaveBeenCalled();
      expect(searchLoyolaBuildings).not.toHaveBeenCalled();
    });

    test("uses Loyola search when campus is LOY", () => {
      (searchLoyolaBuildings as jest.Mock).mockImplementation((q: string) => {
        if (q.toLowerCase().includes("administration")) {
          return [{ id: "ad", code: "AD", campus: "LOY" }];
        }
        return [];
      });

      const res = parseLocationDetails(
        "Loyola Campus - Administration Building - Rm 101",
      );

      expect(res.building?.code).toBe("AD");
      expect(searchLoyolaBuildings).toHaveBeenCalled();
      expect(searchSGWBuildings).not.toHaveBeenCalled();
    });

    test("falls back to both campuses when no campus is specified", () => {
      (searchSGWBuildings as jest.Mock).mockImplementation((q: string) => {
        if (q.toLowerCase().includes("henry f. hall")) {
          return [{ id: "hall", code: "H", campus: "SGW" }];
        }
        return [];
      });

      (searchLoyolaBuildings as jest.Mock).mockReturnValue([]);

      const res = parseLocationDetails("Henry F. Hall Building");

      expect(res.building?.code).toBe("H");
      expect(res.campus).toBe("SGW");
      expect(res.room).toBeUndefined();
    });

    test("finds building using code in parentheses fallback", () => {
      (searchSGWBuildings as jest.Mock).mockImplementation((q: string) => {
        if (q.trim() === "H") {
          return [{ id: "hall", code: "H", campus: "SGW" }];
        }
        return [];
      });

      (searchLoyolaBuildings as jest.Mock).mockReturnValue([]);

      const res = parseLocationDetails("Random Event (H)");

      expect(res.building?.code).toBe("H");
      expect(res.campus).toBe("SGW");
    });

    test("building campus overrides detected campus", () => {
      (searchSGWBuildings as jest.Mock).mockImplementation((q: string) => {
        if (q.toLowerCase().includes("strange building")) {
          return [{ id: "weird", code: "X", campus: "LOY" }];
        }
        return [];
      });

      const res = parseLocationDetails(
        "SGW Campus - Strange Building - Rm 100",
      );

      expect(res.building?.code).toBe("X");
      expect(res.campus).toBe("LOY");
    });

    test("tries query variants until one matches", () => {
      (searchSGWBuildings as jest.Mock).mockImplementation((q: string) => {
        const normalized = q.toLowerCase();

        if (normalized.includes("hall")) {
          return [{ id: "hall", code: "H", campus: "SGW" }];
        }

        return [];
      });

      const res = parseLocationDetails(
        "SGW Campus - Henry F. Hall Building - Rm 205",
      );

      expect(res.building?.code).toBe("H");
      expect(res.room).toBe("205");
      expect(res.campus).toBe("SGW");
      expect(searchSGWBuildings).toHaveBeenCalled();
    });
  });
});
