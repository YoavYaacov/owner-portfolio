// Shared result type for every financial calculation in this module.
//
// Master Prompt §6: "נתון שגוי גרוע מנתון חסר" — a wrong number is worse
// than a missing one. No function in src/lib/finance/** ever returns 0 or a
// best-guess when its inputs are missing or unreliable; it returns
// `{ ok: false, ... }` instead, and every caller (UI included) must handle
// that case explicitly rather than falling back to a number (ADR-023).
export type CalcResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string; missing: string[] }

export function ok<T>(value: T): CalcResult<T> {
  return { ok: true, value }
}

export function insufficient<T>(reason: string, missing: string[]): CalcResult<T> {
  return { ok: false, reason, missing }
}
