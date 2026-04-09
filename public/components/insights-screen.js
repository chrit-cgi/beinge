import { LitElement, html, css, svg } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js'
import { apiFetch } from '/app.js'

const DUTCH_DAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return DUTCH_DAYS_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]
}

class InsightsScreen extends LitElement {
  static properties = {
    _data:    { state: true },
    _loading: { state: true },
  }

  static styles = css`
    :host { display: block; padding: 24px 16px; }
    .section-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--color-text-muted, #888); margin-bottom: 4px;
    }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: var(--color-text, #111); }
    .summary { font-size: 15px; line-height: 1.6; color: var(--color-text, #111); margin-top: 16px; }
    .insufficient { padding: 48px 0; text-align: center; color: var(--color-text-muted, #888); }
    svg { width: 100%; height: 180px; overflow: visible; }
  `

  constructor() {
    super()
    this._data = null
    this._loading = false
  }

  connectedCallback() {
    super.connectedCallback()
    this._load()
  }

  async _load() {
    this._loading = true
    try {
      const res = await apiFetch('/api/v1/insights')
      if (res.ok) this._data = await res.json()
    } catch (_) {}
    this._loading = false
  }

  _renderGraph(days) {
    const W = 320
    const H = 140
    const PAD_L = 24
    const PAD_B = 28
    const chartW = W - PAD_L - 8
    const chartH = H - PAD_B - 8

    const colW = chartW / 7
    const scored = days.map((d, i) => ({
      x: PAD_L + i * colW + colW / 2,
      y: d.moodScore !== null ? H - PAD_B - ((d.moodScore - 1) / 4) * chartH - 8 : null,
      label: dayLabel(d.date),
      score: d.moodScore,
    }))

    // Build path for connected line segments (skip null gaps)
    let pathD = ''
    let inLine = false
    for (const pt of scored) {
      if (pt.y === null) { inLine = false; continue }
      if (!inLine) { pathD += `M ${pt.x} ${pt.y} `; inLine = true }
      else { pathD += `L ${pt.x} ${pt.y} ` }
    }

    return html`
      <svg viewBox="0 0 ${W} ${H}" aria-label="Stemmingsgrafiek afgelopen 7 dagen">
        <!-- Y axis labels -->
        ${[1,2,3,4,5].map((score) => {
          const y = H - PAD_B - ((score - 1) / 4) * chartH - 8
          return svg`<text x="20" y="${y + 4}" font-size="9" fill="var(--color-text-muted)" text-anchor="end">${score}</text>`
        })}
        <!-- Grid lines -->
        ${[1,3,5].map((score) => {
          const y = H - PAD_B - ((score - 1) / 4) * chartH - 8
          return svg`<line x1="${PAD_L}" y1="${y}" x2="${W - 8}" y2="${y}" stroke="var(--color-border)" stroke-width="1" stroke-dasharray="3,3"/>`
        })}
        <!-- Trend line -->
        ${pathD ? svg`<path d="${pathD}" stroke="var(--color-accent)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
        <!-- Data points -->
        ${scored.map((pt) => pt.y !== null
          ? svg`<circle cx="${pt.x}" cy="${pt.y}" r="5" fill="var(--color-accent)"/>`
          : svg`<circle cx="${pt.x}" cy="${H - PAD_B - chartH / 2 - 8}" r="4" fill="none" stroke="var(--color-border)" stroke-width="1.5" stroke-dasharray="2,2"/>`
        )}
        <!-- X axis labels -->
        ${scored.map((pt) => svg`
          <text x="${pt.x}" y="${H - 6}" font-size="10" fill="var(--color-text-muted)" text-anchor="middle">${pt.label}</text>
        `)}
      </svg>
    `
  }

  render() {
    if (this._loading) return html`<div style="padding:48px 0;text-align:center;color:var(--color-text-muted)">Laden...</div>`
    if (!this._data) return html``

    const { days, summary, hasEnoughData } = this._data

    if (!hasEnoughData) {
      return html`
        <div class="section-label">DAGELIJKSE INZICHT</div>
        <h1>Stemmingsverloop</h1>
        <div class="insufficient">${summary}</div>
      `
    }

    return html`
      <div class="section-label">DAGELIJKSE INZICHT</div>
      <h1>Stemmingsverloop</h1>
      ${this._renderGraph(days)}
      <p class="summary">${summary}</p>
    `
  }
}

customElements.define('insights-screen', InsightsScreen)
