import { useMemo } from "react";
import type { CalendarEvent } from "@/services/googleCalendar";
import {
  startOfMonth,
  daysInMonth,
  parseISO,
  dateKeyFromDate,
  dateKey,
} from "@/services/calendarUtils";

type MonthCell = { type: "blank" } | { type: "day"; date: Date };

export function useCalendarDerived(events: CalendarEvent[], monthCursor: Date) {
  // days that have at least one event (for the dot)
  const eventDaySet = useMemo(() => {
    const s = new Set<string>();
    for (const ev of events) {
      const d = parseISO(ev.startISO);
      if (d) s.add(dateKeyFromDate(d));
    }
    return s;
  }, [events]);

  // month grid: leading blanks + days
  const monthGrid = useMemo(() => {
    const first = startOfMonth(monthCursor);
    const leadingBlanks = first.getDay(); // 0=Sun
    const count = daysInMonth(monthCursor);

    const cells: MonthCell[] = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push({ type: "blank" });

    for (let day = 1; day <= count; day++) {
      cells.push({
        type: "day",
        date: new Date(first.getFullYear(), first.getMonth(), day),
      });
    }
    return cells;
  }, [monthCursor]);

  const todayKey = useMemo(() => dateKeyFromDate(new Date()), []);

  // grouped upcoming events list
  const grouped = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const k = dateKey(ev.startISO);
      const arr = m.get(k) ?? [];
      arr.push(ev);
      m.set(k, arr);
    }

    const keys = Array.from(m.keys()).sort((a, b) => a.localeCompare(b));
    return keys.map((k) => ({
      key: k,
      items: (m.get(k) ?? []).sort((a, b) => {
        const da = parseISO(a.startISO)?.getTime() ?? 0;
        const db = parseISO(b.startISO)?.getTime() ?? 0;
        return da - db;
      }),
    }));
  }, [events]);

  return { eventDaySet, monthGrid, todayKey, grouped };
}
