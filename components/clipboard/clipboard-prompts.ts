/**
 * Rotating prompts shown at the top of the Clipboard page.
 *
 * Picked deterministically from the date so a user sees the same prompt
 * for a given day across reloads, but a fresh one tomorrow. Keeps the
 * MVP simple — no preferences, no DB write, no AI.
 */
export const CLIPBOARD_PROMPTS = [
  "What were you grateful for today?",
  "Did anything small stand out to you today?",
  "What was special about today?",
  "What do you want to remember?",
  "Who made today better?",
  "What felt beautiful today?",
  "What surprised you?",
] as const;

export function pickPromptForToday(now = new Date()): string {
  // Day-of-year index — stable across timezone shifts within a day.
  const start = Date.UTC(now.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ) - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const index = dayOfYear % CLIPBOARD_PROMPTS.length;
  return CLIPBOARD_PROMPTS[index]!;
}
