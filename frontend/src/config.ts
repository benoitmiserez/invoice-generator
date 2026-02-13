/**
 * Invoice form options loaded from environment variables.
 * Set these in frontend/.env (copy from .env.example). Your .env is gitignored
 * so your personal options are not committed.
 */

function parseList(value: string | undefined): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse VITE_DESCRIPTION_SUGGESTIONS: "GroupName:opt1,opt2;OtherGroup:opt1"
 * Returns Record<groupName, string[]>
 */
function parseDescriptionSuggestions(value: string | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!value || typeof value !== 'string') return out;
  const groups = value.split(';').map((s) => s.trim()).filter(Boolean);
  for (const group of groups) {
    const colon = group.indexOf(':');
    if (colon === -1) continue;
    const groupName = group.slice(0, colon).trim();
    const list = group
      .slice(colon + 1)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    out[groupName] = list;
  }
  return out;
}

export const unitOptions = parseList(import.meta.env.VITE_UNITS);
export const rateOptions = parseList(import.meta.env.VITE_RATES);
export const groupNameOptions = parseList(import.meta.env.VITE_GROUP_NAMES);
export const descriptionSuggestionsByGroup = parseDescriptionSuggestions(
  import.meta.env.VITE_DESCRIPTION_SUGGESTIONS
);
