// Master Prompt §23: never show a raw backend error / stack trace. Every
// data-layer function returns a short, human, Hebrew message on failure and
// logs the real error to the console for debugging — the user only ever
// sees the safe version.
export function toHumanError(error: unknown, context: string): string {
  // eslint-disable-next-line no-console
  console.error(`[dataApi] ${context}:`, error)
  return `${context}. הנתונים שהזנת לא אבדו — ניתן לנסות שוב.`
}
