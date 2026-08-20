import type { StatsPeriod } from "../database/database.js";

function toInteger(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

export function parseStatsPeriod(searchParams: URLSearchParams): StatsPeriod {
  const type = searchParams.get("period") ?? "current_week";

  if (type === "alltime") {
    return { type: "alltime" };
  }

  if (type === "week") {
    const year = toInteger(searchParams.get("year"));
    const week = toInteger(searchParams.get("week"));

    if (year && week && week >= 1 && week <= 53) {
      return { type: "week", year, week };
    }
  }

  if (type === "month") {
    const year = toInteger(searchParams.get("year"));
    const month = toInteger(searchParams.get("month"));

    if (year && month && month >= 1 && month <= 12) {
      return { type: "month", year, month };
    }
  }

  return { type: "current_week" };
}

export function describeStatsPeriod(period: StatsPeriod): string {
  if (period.type === "current_week") {
    return "Saptamana curenta";
  }

  if (period.type === "week") {
    return `Saptamana ${period.week} / ${period.year}`;
  }

  if (period.type === "month") {
    return `Luna ${period.month} / ${period.year}`;
  }

  return "All-time";
}
