/**
 * The API sends naive UTC timestamps (no trailing `Z`), so append one before
 * parsing — otherwise the browser reads them as local time and every stamp is
 * off by the timezone offset.
 */
export function formatStamp(value: string) {
  const iso = /(Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
