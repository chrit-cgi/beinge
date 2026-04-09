type Level = 'info' | 'warn' | 'error'

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}
