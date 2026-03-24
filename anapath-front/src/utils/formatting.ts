/** Format an ISO date string as dd/mm/yyyy (fr-FR locale). Returns '—' for empty values. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

/** Truncate a string to `max` characters, appending '…' if cut. Returns '' for empty/null values. */
export function truncate(text: string | null | undefined, max: number): string {
  if (!text?.trim()) return ''
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}
