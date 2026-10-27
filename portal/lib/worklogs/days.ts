/* Worklog days; free of server imports so screens can use it too. */

/** The latest worklog of each day; older copies of a day are left out. */
export function latestPerDay<
  T extends { date?: string | null; updatedAt?: unknown },
>(logs: T[]): T[] {
  const byDate = new Map<string, T>();
  for (const log of logs) {
    if (!log.date) continue;
    const seen = byDate.get(log.date);
    if (
      !seen ||
      new Date(log.updatedAt as string) > new Date(seen.updatedAt as string)
    )
      byDate.set(log.date, log);
  }
  return Array.from(byDate.values()).sort((a, b) =>
    (a.date ?? '').localeCompare(b.date ?? ''),
  );
}
