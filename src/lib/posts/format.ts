const bytesPerUnit = 1024;
const suffixes = ["K", "M", "G"] as const;
// Like `ls -h`: one decimal below 10 of a unit, whole numbers from 10 up
const decimalLimit = 10;
const fractionDigits = 1;

export function formatSize(bytes: number): string {
  if (bytes < bytesPerUnit) {
    return String(bytes);
  }

  let value = bytes;
  let suffix = "";
  for (const next of suffixes) {
    if (value < bytesPerUnit) {
      break;
    }
    value /= bytesPerUnit;
    suffix = next;
  }

  const digits =
    value < decimalLimit
      ? value.toFixed(fractionDigits)
      : String(Math.round(value));
  return `${digits}${suffix}`;
}

export function formatDate(date: Date): string {
  // The ISO string is always UTC: "YYYY-MM-DDTHH:mm:ss.sssZ"
  const [isoDate] = date.toISOString().split("T");
  return isoDate;
}
