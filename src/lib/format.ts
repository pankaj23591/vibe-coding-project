export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function sentimentLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
