// REVIEW ONLY — move to src/lib/ics.ts once M8 is approved.
// Builds a safe .ics invite from stored UTC times. Escapes text to prevent header injection.
const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildIcs(o: { id: string; title: string; start: Date; end: Date; location?: string; description?: string }) {
  if (!(o.end > o.start)) throw new Error("end must be after start");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Global Career ID//Interviews//EN", "BEGIN:VEVENT",
    `UID:${o.id.replace(/[^a-zA-Z0-9-]/g, "")}@globalcareerid.com`,
    `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(o.start)}`, `DTEND:${utc(o.end)}`,
    `SUMMARY:${esc(o.title)}`,
    o.location ? `LOCATION:${esc(o.location)}` : "",
    o.description ? `DESCRIPTION:${esc(o.description)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
