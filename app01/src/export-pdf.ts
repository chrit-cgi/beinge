import PDFDocument from 'pdfkit'
import type { ExportEntry } from './export-csv'

/**
 * Generates a PDF buffer from a list of entries.
 * One section per entry: date as bold heading, mood score line, full note text.
 */
export function toPDF(entries: ExportEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(20).font('Helvetica-Bold').text('beinge — export', { align: 'center' })
    doc.moveDown(1.5)

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (i > 0) {
        doc.addPage()
      }

      // Date heading
      doc.fontSize(16).font('Helvetica-Bold').text(entry.date)
      doc.moveDown(0.5)

      // Mood score
      const score = entry.moodScore !== null ? `Stemming: ${entry.moodScore}/5` : 'Stemming: niet ingesteld'
      doc.fontSize(12).font('Helvetica').text(score)
      doc.moveDown(0.5)

      // Note text
      const note = entry.noteText ?? '(geen notitie)'
      doc.fontSize(12).font('Helvetica').text(note, { lineGap: 4 })
    }

    if (entries.length === 0) {
      doc.fontSize(12).font('Helvetica').text('Geen notities in deze periode.', { align: 'center' })
    }

    doc.end()
  })
}
