export function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function parseISO(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dateKey(startISO?: string) {
  const d = parseISO(startISO);
  if (!d) return "unknown";
  return dateKeyFromDate(d);
}

export function formatDayHeader(d: Date) {
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${weekdays[d.getDay()]} ${months[d.getMonth()]} ${day}${suffix} ${d.getFullYear()}`;
}

export function formatTimeRange(startISO?: string, endISO?: string) {
  const s = parseISO(startISO);
  const e = parseISO(endISO);

  if (!s || !e) return "All day";
  const startHasTime = startISO?.includes("T");
  const endHasTime = endISO?.includes("T");
  if (!startHasTime || !endHasTime) return "All day";

  const to12 = (d: Date) => {
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${pad2(m)} ${ampm}`;
  };

  return `${to12(s)} - ${to12(e)}`;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function monthTitle(d: Date) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}
