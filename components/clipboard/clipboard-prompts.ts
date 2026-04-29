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
  "Who made today better?",
  "What surprised you?",
  "What's on your mind?",
  "What stood out today?",
  "Did anything feel different today?",
  "Did something make you smile today?",
  "Has anything surprised you today?",
  "Who have you thought about today?",
  "Best part of your day?",
  "What felt peaceful today?",
  "What felt hard today?",
  "What are you grateful for today?",
  "What did you learn today?",
  "What made you laugh today?",
  "What picture from today reflects it best?",
  "What place did you enjoy being today?",
  "What changed your energy today?",
  "What are you carrying with you tonight?",
  "What thought deserves space here?",
  "Was anything unexpectedly nice today?",
  "What did you notice about yourself today?",
  "What are you looking forward to?",
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
