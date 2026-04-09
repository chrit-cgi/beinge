export interface ExportEntry {
  date: string
  moodScore: number | null
  noteText: string | null
}

/**
 * RFC 4180 compliant CSV serialisation.
 * Header: date,score,note
 * Fields with commas, newlines, or double-quotes are double-quote wrapped.
 * Internal double-quotes are escaped as "".
 */
export function toCSV(entries: ExportEntry[]): string {
  const rows: string[] = ['date,score,note']
  for (const entry of entries) {
    const date = entry.date
    const score = entry.moodScore !== null ? String(entry.moodScore) : ''
    const note = csvField(entry.noteText ?? '')
    rows.push(`${date},${score},${note}`)
  }
  return rows.join('\n') + '\n'
}

function csvField(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}
