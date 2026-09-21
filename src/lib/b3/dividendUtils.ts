/**
 * Dividend utility functions for accurate date parsing and B3/FII payment schedules.
 * Prevents timezone offset shifts (e.g. UTC-3 Brasilia moving 01/09 to 31/08).
 */

export interface NormalizedDividendEvent {
  date: Date;
  dateStr: string;
  formattedDate: string;
  isAnnounced: boolean;
  isEstimatedDate: boolean;
}

/**
 * Safely parse a date string (YYYY-MM-DD or ISO) into a local Date object.
 * Anchors at midday (12:00:00) to ensure immunity from UTC offset or daylight saving shifts.
 */
export function parseLocalDate(dateInput: string | Date | undefined | null): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 12, 0, 0);
  }

  const str = String(dateInput).trim();
  const cleanStr = str.includes("T") ? str.split("T")[0] : str.split(" ")[0];
  const parts = cleanStr.split("-");

  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day, 12, 0, 0);
    }
  }

  const fallback = new Date(dateInput);
  return isNaN(fallback.getTime())
    ? new Date()
    : new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate(), 12, 0, 0);
}

/**
 * Formats a date cleanly as DD/MM/YYYY without any timezone shifting.
 */
export function formatLocalDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "";

  if (typeof dateInput === "string") {
    const cleanStr = dateInput.includes("T") ? dateInput.split("T")[0] : dateInput.split(" ")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
  }

  const d = parseLocalDate(dateInput);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Extracts { year, month, key } reliably for grouping (month is 0-indexed).
 */
export function getYearMonthKey(dateInput: string | Date | undefined | null): {
  year: number;
  month: number;
  key: string;
} {
  const d = parseLocalDate(dateInput);
  const year = d.getFullYear();
  const month = d.getMonth();
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return { year, month, key };
}

/**
 * Determines whether a ticker corresponds to a Real Estate Fund (FII / Fiagro).
 */
export function isFiiTicker(ticker: string): boolean {
  if (!ticker) return false;
  const clean = ticker.replace(".SA", "").trim().toUpperCase();
  return clean.endsWith("11") || clean.includes("FII");
}

/**
 * Calculates the realistic payment date for an asset.
 * For B3 FIIs:
 * - Yahoo Finance records the Ex-date on day 1..5 of the month or day 28..31.
 * - FIIs pay on the 10th to 15th of the month (never on day 1..3 or Sundays).
 * - If the date provided is an ex-date on day 1..5, payment occurs on the 14th/15th of that same month.
 * - If the date provided is an ex-date on day >= 25, payment occurs on the 14th/15th of the following month.
 */
export function resolveEffectivePaymentDate(
  ticker: string,
  div: {
    date?: string;
    paymentDate?: string;
    payment_date?: string;
    recordDate?: string;
    record_date?: string;
    status?: string;
  }
): {
  date: Date;
  dateStr: string;
  formattedDate: string;
  isEstimatedDate: boolean;
} {
  const isFii = isFiiTicker(ticker);

  // Raw candidate string
  const explicitPayDate = div.paymentDate || div.payment_date;
  const rawDateStr = explicitPayDate || div.date;
  const parsedDate = parseLocalDate(rawDateStr);

  let finalDate = parsedDate;
  let isEstimatedDate = false;

  if (isFii) {
    const day = parsedDate.getDate();
    // If no explicit payment date was provided, OR if the explicit payment date
    // was mistakenly assigned to the Ex-date on day 1..5:
    const isExDateAtStartOfMonth = day <= 5;
    const isExDateAtEndOfMonth = day >= 25;

    if (!explicitPayDate || explicitPayDate === div.date) {
      if (isExDateAtStartOfMonth) {
        // Ex-date on day 1..5 of month M -> Payment occurs on 14th of month M
        let payDay = 14;
        let candidate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), payDay, 12, 0, 0);
        // If 14th falls on weekend, shift to Friday or Monday
        if (candidate.getDay() === 0) payDay = 15; // Sunday -> Monday
        else if (candidate.getDay() === 6) payDay = 13; // Saturday -> Friday
        finalDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), payDay, 12, 0, 0);
        isEstimatedDate = true;
      } else if (isExDateAtEndOfMonth) {
        // Ex-date on day >= 25 of month M-1 -> Payment occurs on 14th of month M
        let payDay = 14;
        let candidate = new Date(parsedDate.getFullYear(), parsedDate.getMonth() + 1, payDay, 12, 0, 0);
        if (candidate.getDay() === 0) payDay = 15;
        else if (candidate.getDay() === 6) payDay = 13;
        finalDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth() + 1, payDay, 12, 0, 0);
        isEstimatedDate = true;
      }
    }
  } else {
    // For stocks: if payment date falls on Sunday (day 0) or Saturday (day 6),
    // adjust to nearest business day (Monday if Sunday)
    if (finalDate.getDay() === 0) {
      finalDate = new Date(finalDate.getFullYear(), finalDate.getMonth(), finalDate.getDate() + 1, 12, 0, 0);
    }
  }

  const y = finalDate.getFullYear();
  const m = String(finalDate.getMonth() + 1).padStart(2, "0");
  const d = String(finalDate.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  return {
    date: finalDate,
    dateStr,
    formattedDate: `${d}/${m}/${y}`,
    isEstimatedDate,
  };
}
