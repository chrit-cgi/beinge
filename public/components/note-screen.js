import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js'
import { apiFetch, formatDutchDate } from '/app.js'

class NoteScreen extends LitElement {
  static properties = {
    'entry-date': { type: String },
    _noteText:    { type: String, state: true },
    _moodScore:   { type: Number, state: true },
    _saveLabel:   { type: String, state: true },
    _loading:     { type: Boolean, state: true },
  }

  static styles = css`
    :host([hidden]) { display: none; }
    :host { display: block; padding: 24px 16px; }
    .date-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted, #888);
      margin-bottom: 8px;
    }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: var(--color-text, #111); }
    .content-row { display: flex; gap: 16px; height: calc(100dvh - 56px - 60px - 180px); min-height: 200px; }
    textarea {
      flex: 7;
      resize: none;
      border: none;
      border-bottom: 1px solid var(--color-border, #e5e5e5);
      padding: 12px 0;
      font-size: 16px;
      line-height: 1.6;
      background: transparent;
      color: var(--color-text, #111);
      outline: none;
    }
    textarea:focus { border-bottom-color: var(--color-accent, #3ab5ad); }
    .slider-col {
      flex: 3;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding-top: 8px;
    }
    .slider-label { font-size: 12px; color: var(--color-text-muted, #888); }
    input[type=range] {
      writing-mode: vertical-lr;
      direction: rtl;
      height: 100%;
      width: 32px;
      accent-color: var(--color-accent, #3ab5ad);
      cursor: pointer;
    }
    .save-btn {
      margin-top: 16px;
      width: 100%;
      padding: 14px;
      background: var(--color-accent, #3ab5ad);
      color: var(--color-accent-fg, #fff);
      border: none;
      border-radius: 9999px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .save-btn:disabled { opacity: 0.6; cursor: default; }
  `

  constructor() {
    super()
    this._noteText = ''
    this._moodScore = null
    this._saveLabel = 'Opslaan'
    this._loading = false
    this['entry-date'] = null
  }

  updated(changed) {
    if (changed.has('entry-date') && this['entry-date']) {
      this._load(this['entry-date'])
    }
  }

  async _load(date) {
    this._loading = true
    try {
      const res = await apiFetch(`/api/v1/entries/${date}`)
      if (res.ok) {
        const entry = await res.json()
        this._noteText = entry.noteText ?? ''
        this._moodScore = entry.moodScore ?? null
      } else {
        this._noteText = ''
        this._moodScore = null
      }
    } catch (_) {}
    this._loading = false
  }

  async _save() {
    const date = this['entry-date']
    if (!date) return
    this._saveLabel = 'Opslaan...'
    try {
      const res = await apiFetch(`/api/v1/entries/${date}`, {
        method: 'PUT',
        body: JSON.stringify({
          moodScore: this._moodScore,
          noteText: this._noteText || null,
        }),
      })
      if (res.ok) {
        this._saveLabel = 'Opgeslagen ✓'
        setTimeout(() => { this._saveLabel = 'Opslaan' }, 2000)
      } else {
        this._saveLabel = 'Fout — probeer opnieuw'
        setTimeout(() => { this._saveLabel = 'Opslaan' }, 3000)
      }
    } catch (_) {
      this._saveLabel = 'Er is iets misgegaan.'
      setTimeout(() => { this._saveLabel = 'Opslaan' }, 3000)
    }
  }

  render() {
    const date = this['entry-date']
    const displayDate = date ? formatDutchDate(date) : '...'

    return html`
      <div class="date-label">${displayDate}</div>
      <h1>Hoe voel je je?</h1>
      <div class="content-row">
        <textarea
          placeholder="Schrijf hier wat je wilt over je dag..."
          .value=${this._noteText}
          @input=${(e) => { this._noteText = e.target.value }}
          aria-label="Notitie"
        ></textarea>
        <div class="slider-col">
          <span class="slider-label">5</span>
          <input
            type="range"
            min="1" max="5" step="1"
            orient="vertical"
            .value=${String(this._moodScore ?? '')}
            @input=${(e) => { this._moodScore = Number(e.target.value) }}
            aria-label="Stemming: ${this._moodScore ?? 'niet ingesteld'} van de 5"
          />
          <span class="slider-label">1</span>
        </div>
      </div>
      <button class="save-btn" @click=${this._save} ?disabled=${this._loading}>
        ${this._saveLabel}
      </button>
    `
  }
}

customElements.define('note-screen', NoteScreen)
