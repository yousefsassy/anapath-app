/** Format an ISO date string as dd/mm/yyyy (fr-FR locale). Returns '—' for empty values. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'

  const trimmedValue = value.trim()
  if (!trimmedValue) return '—'

  const sqlDateMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (sqlDateMatch) {
    const [, year, month, day] = sqlDateMatch
    return `${day}/${month}/${year}`
  }

  const parsedDate = new Date(trimmedValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return '—'
  }

  return parsedDate.toLocaleDateString('fr-FR')
}

/** Truncate a string to `max` characters, appending '…' if cut. Returns '' for empty/null values. */
export function truncate(text: string | null | undefined, max: number): string {
  if (!text?.trim()) return ''
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}
