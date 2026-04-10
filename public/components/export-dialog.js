import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js'
import { apiFetch } from '/app.js'

class ExportDialog extends LitElement {
  static properties = {
    _from:      { state: true },
    _to:        { state: true },
    _format:    { state: true },
    _loading:   { state: true },
    _error:     { state: true },
    _allEntries:{ state: true },
  }

  static styles = css`
    :host([hidden]) { display: none; }
    :host {
      display: flex; position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); align-items: flex-end; justify-content: center;
      z-index: 400; padding: 24px;
    }
    .dialog {
      background: var(--color-bg); border-radius: 20px; padding: 24px;
      max-width: 400px; width: 100%;
    }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .dialog-header h2 { font-size: 20px; font-weight: 700; }
    .close-btn { width: 44px; height: 44px; font-size: 20px; cursor: pointer; color: var(--color-text-muted); border: none; background: none; }
    label { display: block; font-size: 13px; font-weight: 600; color: var(--color-text-muted); margin-bottom: 4px; }
    input[type=date] {
      width: 100%; padding: 10px 12px; border: 1px solid var(--color-border);
      border-radius: 8px; font-size: 15px; color: var(--color-text); background: var(--color-bg);
      margin-bottom: 16px;
    }
    .preset-btn {
      width: 100%; padding: 10px; border: 1.5px solid var(--color-border);
      border-radius: 8px; font-size: 15px; background: transparent; color: var(--color-text); cursor: pointer; margin-bottom: 16px;
    }
    .format-row { display: flex; gap: 8px; margin-bottom: 16px; }
    .format-btn {
      flex: 1; padding: 10px; border: 1.5px solid var(--color-border); border-radius: 8px;
      font-size: 15px; background: transparent; color: var(--color-text); cursor: pointer;
    }
    .format-btn.active { border-color: var(--color-accent); color: var(--color-accent); font-weight: 600; }
    .error-msg { font-size: 13px; color: var(--color-danger); margin-bottom: 12px; }
    .warn-msg { font-size: 13px; color: var(--color-text-muted); margin-bottom: 12px; }
    .download-btn {
      width: 100%; padding: 14px; background: var(--color-accent); color: var(--color-accent-fg);
      border: none; border-radius: 9999px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 12px;
    }
    .download-btn:disabled { opacity: 0.5; cursor: default; }
    .cancel-btn {
      width: 100%; padding: 14px; background: transparent; border: 1.5px solid var(--color-border);
      color: var(--color-text); border-radius: 9999px; font-size: 16px; font-weight: 600; cursor: pointer;
    }
  `

  constructor() {
    super()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    this._to = yesterday.toISOString().slice(0, 10)
    this._from = this._to
    this._format = 'csv'
    this._loading = false
    this._error = null
    this._allEntries = []
    this._loadEntries()
  }

  async _loadEntries() {
    const res = await apiFetch('/api/v1/entries')
    if (res.ok) {
      this._allEntries = await res.json()
      if (this._allEntries.length > 0) {
        this._from = this._allEntries[this._allEntries.length - 1].date
      }
    }
  }

  _dismiss() {
    this.hidden = true
  }

  get _rangeError() {
    if (this._from > this._to) return 'De startdatum moet voor de einddatum liggen.'
    return null
  }

  get _rangeWarning() {
    const inRange = this._allEntries.filter((e) => e.date >= this._from && e.date <= this._to)
    if (inRange.length === 0 && !this._rangeError) return 'Geen notities in deze periode.'
    return null
  }

  get _downloadDisabled() {
    return !!this._rangeError || !!this._rangeWarning || this._loading
  }

  async _download() {
    this._loading = true
    this._error = null
    try {
      const url = `/api/v1/export?from=${this._from}&to=${this._to}&format=${this._format}`
      const res = await apiFetch(url)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        this._error = body.error ?? 'Er is iets misgegaan.'
        return
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `beinge-export-${this._from}-${this._to}.${this._format}`
      a.click()
      URL.revokeObjectURL(a.href)
      this._dismiss()
    } catch (err) {
      this._error = 'Er is iets misgegaan. Probeer het opnieuw.'
    } finally {
      this._loading = false
    }
  }

  _setPresetAll() {
    if (this._allEntries.length === 0) return
    this._from = this._allEntries[this._allEntries.length - 1].date
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    this._to = yesterday.toISOString().slice(0, 10)
  }

  render() {
    return html`
      <div class="dialog" role="dialog" aria-modal="true" aria-label="Exporteren">
        <div class="dialog-header">
          <h2>Exporteren</h2>
          <button class="close-btn" @click=${this._dismiss} aria-label="Sluiten">&#215;</button>
        </div>

        <label>Van</label>
        <input type="date" .value=${this._from} ?disabled=${this._loading}
          @change=${(e) => { this._from = e.target.value; this._error = null }} />

        <label>Tot</label>
        <input type="date" .value=${this._to} ?disabled=${this._loading}
          @change=${(e) => { this._to = e.target.value; this._error = null }} />

        <button class="preset-btn" @click=${this._setPresetAll} ?disabled=${this._loading}>Alles</button>

        <label>Formaat</label>
        <div class="format-row">
          ${['csv', 'pdf'].map((f) => html`
            <button class="format-btn ${this._format === f ? 'active' : ''}"
              @click=${() => { this._format = f }} ?disabled=${this._loading}>
              ${f.toUpperCase()}
            </button>
          `)}
        </div>

        ${this._rangeError ? html`<div class="error-msg">${this._rangeError}</div>` : ''}
        ${this._rangeWarning ? html`<div class="warn-msg">${this._rangeWarning}</div>` : ''}
        ${this._error ? html`<div class="error-msg">${this._error}</div>` : ''}

        <button class="download-btn" @click=${this._download} ?disabled=${this._downloadDisabled}>
          ${this._loading ? 'Bezig met exporteren...' : 'Downloaden'}
        </button>
        <button class="cancel-btn" @click=${this._dismiss}>Annuleren</button>
      </div>
    `
  }
}

customElements.define('export-dialog', ExportDialog)
