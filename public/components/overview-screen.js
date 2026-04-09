import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js'
import { apiFetch, formatDutchDate } from '/app.js'

class OverviewScreen extends LitElement {
  static properties = {
    _entries:  { state: true },
    _query:    { state: true },
    _loading:  { state: true },
  }

  static styles = css`
    :host { display: block; padding: 0 0 16px; }
    .search-bar {
      position: sticky;
      top: 0;
      padding: 12px 16px;
      background: var(--color-bg, #fff);
      z-index: 10;
    }
    .search-input {
      width: 100%;
      padding: 10px 14px 10px 36px;
      background: var(--color-surface, #f5f5f5);
      border: none;
      border-radius: 12px;
      font-size: 15px;
      color: var(--color-text, #111);
      position: relative;
    }
    .search-wrap { position: relative; }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-muted, #888);
      font-size: 16px;
      pointer-events: none;
    }
    .entry-list { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
    .entry-card {
      background: var(--color-surface, #f5f5f5);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
    }
    .entry-card:active { opacity: 0.8; }
    .entry-date {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted, #888);
      margin-bottom: 6px;
    }
    .entry-note { font-size: 15px; color: var(--color-text, #111); margin-bottom: 12px; }
    .entry-footer { display: flex; align-items: center; justify-content: space-between; }
    .mood-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .edit-icon { color: var(--color-text-muted, #888); font-size: 18px; }
    .empty-state { padding: 48px 24px; text-align: center; color: var(--color-text-muted, #888); }
    .no-results { padding: 24px; text-align: center; color: var(--color-text-muted, #888); }
  `

  constructor() {
    super()
    this._entries = []
    this._query = ''
    this._loading = false
  }

  connectedCallback() {
    super.connectedCallback()
    this._load()
  }

  async _load() {
    this._loading = true
    try {
      const res = await apiFetch('/api/v1/entries')
      if (res.ok) this._entries = await res.json()
    } catch (_) {}
    this._loading = false
  }

  get _filtered() {
    if (!this._query) return this._entries
    const q = this._query.toLowerCase()
    return this._entries.filter((e) => (e.noteText ?? '').toLowerCase().includes(q))
  }

  _moodColor(score) {
    const colors = { 1: '#e05252', 2: '#e8964d', 3: '#c8c84a', 4: '#5abf7a', 5: '#3ab55a' }
    return colors[score] ?? 'var(--color-border)'
  }

  _openEntry(date) {
    this.dispatchEvent(new CustomEvent('open-entry', { detail: { date }, bubbles: true, composed: true }))
  }

  render() {
    const filtered = this._filtered

    return html`
      <div class="search-bar">
        <div class="search-wrap">
          <span class="search-icon">&#128269;</span>
          <input
            class="search-input"
            type="search"
            placeholder="Zoek in je notities..."
            .value=${this._query}
            @input=${(e) => { this._query = e.target.value }}
            aria-label="Zoek in notities"
          />
        </div>
      </div>

      ${this._loading ? html`<div class="empty-state">Laden...</div>` :
        this._entries.length === 0 ? html`
          <div class="empty-state">Nog geen notities — begin vandaag met loggen.</div>
        ` :
        filtered.length === 0 ? html`
          <div class="no-results">Geen notities gevonden voor "${this._query}".</div>
        ` :
        html`
          <div class="entry-list">
            ${filtered.map((entry) => html`
              <div class="entry-card" @click=${() => this._openEntry(entry.date)} role="button" tabindex="0"
                aria-label="Notitie van ${formatDutchDate(entry.date)} bewerken">
                <div class="entry-date">${formatDutchDate(entry.date).toUpperCase()}</div>
                <div class="entry-note">${(entry.noteText ?? '').split('\n')[0] || '—'}</div>
                <div class="entry-footer">
                  <div class="mood-circle" style="background:${this._moodColor(entry.moodScore)}"></div>
                  <span class="edit-icon">&#9998;</span>
                </div>
              </div>
            `)}
          </div>
        `
      }
    `
  }
}

customElements.define('overview-screen', OverviewScreen)
