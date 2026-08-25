export function formatDateTime(date: string | Date, timezone: string): string {
  return new Date(date).toLocaleString("es-ES", { timeZone: timezone });
}

export function formatDate(date: string | Date, timezone: string): string {
  return new Date(date).toLocaleDateString("es-ES", { timeZone: timezone });
}

export const TIMEZONES = [
  "Europe/Madrid",
  "Europe/London",
  "Europe/Lisbon",
  "Atlantic/Canary",
  "America/Mexico_City",
  "America/Bogota",
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "UTC",
] as const;
