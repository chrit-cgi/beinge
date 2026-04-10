import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js'
import { apiFetch, applyTheme } from '/app.js'

class SettingsScreen extends LitElement {
  static properties = {
    _settings:  { state: true },
    _saving:    { state: true },
    _showConfirm: { state: true },
    _deleting:  { state: true },
  }

  static styles = css`
    :host([hidden]) { display: none; }
    :host { display: block; padding: 24px 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; }
    .setting-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 0; border-bottom: 1px solid var(--color-border);
    }
    .setting-label { font-size: 16px; color: var(--color-text); }
    select, input[type=time] {
      padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 8px;
      background: var(--color-bg); color: var(--color-text); font-size: 15px;
    }
    .danger-btn {
      margin-top: 40px; width: 100%; padding: 14px;
      background: transparent; border: 1.5px solid var(--color-danger);
      color: var(--color-danger); border-radius: 9999px; font-size: 16px; font-weight: 600; cursor: pointer;
    }
    .confirm-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: flex-end; justify-content: center; z-index: 600; padding: 24px;
    }
    .confirm-sheet {
      background: var(--color-bg); border-radius: 20px; padding: 24px;
      max-width: 400px; width: 100%;
    }
    .confirm-sheet h2 { font-size: 18px; margin-bottom: 12px; }
    .confirm-sheet p { font-size: 15px; color: var(--color-text-muted); margin-bottom: 24px; }
    .confirm-sheet .del-btn {
      width: 100%; padding: 14px; background: var(--color-danger); color: #fff;
      border: none; border-radius: 9999px; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 12px;
    }
    .confirm-sheet .cancel-btn {
      width: 100%; padding: 14px; background: transparent; border: 1.5px solid var(--color-border);
      color: var(--color-text); border-radius: 9999px; font-size: 16px; font-weight: 600; cursor: pointer;
    }
  `

  constructor() {
    super()
    this._settings = { theme: 'system', reminderEnabled: false, reminderTime: null }
    this._saving = false
    this._showConfirm = false
    this._deleting = false
  }

  connectedCallback() {
    super.connectedCallback()
    this._load()
  }

  async _load() {
    const res = await apiFetch('/api/v1/settings')
    if (res.ok) this._settings = await res.json()
  }

  async _update(patch) {
    this._saving = true
    const res = await apiFetch('/api/v1/settings', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      this._settings = await res.json()
      if (patch.theme) applyTheme(patch.theme)
    }
    this._saving = false
  }

  async _deleteAccount() {
    this._deleting = true
    const res = await apiFetch('/api/v1/account', { method: 'DELETE' })
    if (res.status === 204) {
      await window.Clerk?.signOut()
      location.reload()
    } else {
      this._deleting = false
      this._showConfirm = false
      alert('Er is iets misgegaan. Probeer het opnieuw.')
    }
  }

  render() {
    const s = this._settings
    return html`
      <h1>Instellingen</h1>

      <div class="setting-row">
        <span class="setting-label">Weergave</span>
        <select .value=${s.theme} @change=${(e) => this._update({ theme: e.target.value })}>
          <option value="system">Systeem</option>
          <option value="light">Licht</option>
          <option value="dark">Donker</option>
        </select>
      </div>

      <div class="setting-row">
        <span class="setting-label">Dagelijkse herinnering</span>
        <input type="checkbox"
          aria-label="Dagelijkse herinnering inschakelen"
          .checked=${s.reminderEnabled}
          @change=${(e) => {
            if (e.target.checked && !s.reminderTime) {
              this._update({ reminderEnabled: true, reminderTime: '20:00' })
            } else {
              this._update({ reminderEnabled: e.target.checked })
            }
          }}
        />
      </div>

      ${s.reminderEnabled ? html`
        <div class="setting-row">
          <span class="setting-label">Tijd herinnering</span>
          <input type="time" aria-label="Tijd van de herinnering" .value=${s.reminderTime ?? '20:00'}
            @change=${(e) => this._update({ reminderEnabled: true, reminderTime: e.target.value })}
          />
        </div>
      ` : ''}

      <button class="danger-btn" @click=${() => { this._showConfirm = true }}>
        Verwijder mijn account
      </button>

      ${this._showConfirm ? html`
        <div class="confirm-overlay">
          <div class="confirm-sheet" role="dialog" aria-modal="true">
            <h2>Weet je het zeker?</h2>
            <p>Dit verwijdert al je notities en kan niet ongedaan worden gemaakt.</p>
            <button class="del-btn" @click=${this._deleteAccount} ?disabled=${this._deleting}>
              ${this._deleting ? 'Verwijderen...' : 'Ja, verwijder alles'}
            </button>
            <button class="cancel-btn" @click=${() => { this._showConfirm = false }}>Annuleren</button>
          </div>
        </div>
      ` : ''}
    `
  }
}

customElements.define('settings-screen', SettingsScreen)
