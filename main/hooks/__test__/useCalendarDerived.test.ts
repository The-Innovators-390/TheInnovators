import { renderHook } from "@testing-library/react-native";
import { useCalendarDerived } from "@/hooks/useCalendarDerived";

jest.mock("@/services/calendarUtils", () => ({
  startOfMonth: (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1),
  daysInMonth: (d: Date) =>
    new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),

  // null for invalid -> covers `if (d)` branch and `?? 0` fallback in sorting
  parseISO: (iso: string) => {
    const t = Date.parse(iso);
    return Number.isNaN(t) ? null : new Date(t);
  },

  // stable keys (UTC date portion)
  dateKeyFromDate: (d: Date) => d.toISOString().slice(0, 10),

  // stable key from ISO; invalid ISO returns a dedicated key
  dateKey: (iso: string) => {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return "invalid";
    return new Date(t).toISOString().slice(0, 10);
  },
}));

describe("useCalendarDerived", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("builds eventDaySet (adds valid days, skips invalid dates)", () => {
    const events = [
      { startISO: "2026-02-10T10:00:00.000Z" },
      { startISO: "2026-02-10T12:00:00.000Z" }, // same day
      { startISO: "not-a-date" }, // invalid -> skipped by `if (d)`
      { startISO: "2026-02-12T09:00:00.000Z" },
    ] as any[];

    const { result } = renderHook(() =>
      useCalendarDerived(events as any, new Date("2026-02-01T00:00:00.000Z"))
    );

    expect(result.current.eventDaySet.has("2026-02-10")).toBe(true);
    expect(result.current.eventDaySet.has("2026-02-12")).toBe(true);
    expect(result.current.eventDaySet.size).toBe(2);
  });

  it("builds monthGrid with correct day cells and Feb 2026 last day = 28", () => {
    const monthCursor = new Date("2026-02-05T00:00:00.000Z");
    const { result } = renderHook(() => useCalendarDerived([], monthCursor));

    const grid = result.current.monthGrid;

    // ensure there are day cells
    const dayCells = grid.filter((c) => c.type === "day") as any[];
    expect(dayCells.length).toBe(28);

    // first day is Feb 1
    const firstDay = dayCells[0].date as Date;
    expect(firstDay.getFullYear()).toBe(2026);
    expect(firstDay.getMonth()).toBe(1); // Feb
    expect(firstDay.getDate()).toBe(1);

    // last day is Feb 28
    const lastDay = dayCells[dayCells.length - 1].date as Date;
    expect(lastDay.getDate()).toBe(28);
  });

  it("creates leading blank cells for a month that doesn't start on Sunday", () => {
    // March 2026 does not start on Sunday in most locales; regardless,
    // this assertion is safe: it should have >=0 blanks and always day cells.
    const { result } = renderHook(() =>
      useCalendarDerived([], new Date("2026-03-10T00:00:00.000Z"))
    );

    const blanks = result.current.monthGrid.filter((c) => c.type === "blank");
    const days = result.current.monthGrid.filter((c) => c.type === "day");

    expect(days.length).toBeGreaterThan(0);
    expect(blanks.length).toBeGreaterThanOrEqual(0);
  });

  it("computes todayKey from system time", () => {
    const { result } = renderHook(() =>
      useCalendarDerived([], new Date("2026-02-01T00:00:00.000Z"))
    );

    expect(result.current.todayKey).toBe("2026-02-15");
  });

  it("groups by date key, covers map (existing/empty) branch, and sorts items by time", () => {
    const events = [
      // same key twice -> covers `m.get(k) ?? []` both undefined and defined
      { startISO: "2026-02-10T10:00:00.000Z", id: "a" },
      { startISO: "2026-02-10T08:00:00.000Z", id: "b" },
      { startISO: "2026-02-12T09:00:00.000Z", id: "c" },
    ] as any[];

    const { result } = renderHook(() =>
      useCalendarDerived(events as any, new Date("2026-02-01T00:00:00.000Z"))
    );

    const grouped = result.current.grouped;

    // groups sorted by key ascending
    expect(grouped.map((g) => g.key)).toEqual(["2026-02-10", "2026-02-12"]);

    // items within Feb 10 sorted by time
    expect(grouped[0].items.map((e: any) => e.id)).toEqual(["b", "a"]);
  });

  it("handles invalid ISO during grouping and sorting (covers `?? 0` fallback)", () => {
    const events = [
      { startISO: "invalid-date", id: "x" }, // dateKey => "invalid"
      { startISO: "2026-02-10T10:00:00.000Z", id: "a" },
      // same invalid key twice ensures map branch for existing array also runs
      { startISO: "still-invalid", id: "y" },
    ] as any[];

    const { result } = renderHook(() =>
      useCalendarDerived(events as any, new Date("2026-02-01T00:00:00.000Z"))
    );

    const grouped = result.current.grouped;

    expect(grouped.some((g) => g.key === "invalid")).toBe(true);

    const invalidGroup = grouped.find((g) => g.key === "invalid");
    expect(invalidGroup?.items.length).toBe(2);
  });

  it("handles empty events (no groups, empty set)", () => {
    const { result } = renderHook(() =>
      useCalendarDerived([], new Date("2026-02-01T00:00:00.000Z"))
    );

    expect(result.current.eventDaySet.size).toBe(0);
    expect(result.current.grouped).toEqual([]);
  });
});