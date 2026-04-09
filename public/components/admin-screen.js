import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js'
import { apiFetch } from '/app.js'

class AdminScreen extends LitElement {
  static properties = {
    _users:   { state: true },
    _total:   { state: true },
    _page:    { state: true },
    _loading: { state: true },
    _query:   { state: true },
    _dashUrl: { state: true },
  }

  static styles = css`
    :host { display: block; padding: 24px 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 16px; }
    .stats-row { display: flex; gap: 16px; margin-bottom: 20px; }
    .stat-block { flex: 1; background: var(--color-surface); border-radius: 12px; padding: 16px; text-align: center; }
    .stat-num { font-size: 28px; font-weight: 700; }
    .stat-label { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
    .search-input {
      width: 100%; padding: 10px 14px; background: var(--color-surface);
      border: none; border-radius: 12px; font-size: 15px; color: var(--color-text); margin-bottom: 16px;
    }
    .clerk-link {
      display: block; text-align: center; padding: 10px; color: var(--color-accent);
      font-size: 15px; font-weight: 600; margin-bottom: 16px;
    }
    .user-card {
      display: flex; align-items: center; gap: 12px;
      background: var(--color-surface); border-radius: 12px; padding: 12px 16px; margin-bottom: 10px;
    }
    .avatar {
      width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-weight: 700; font-size: 14px; color: #fff; flex-shrink: 0;
    }
    .user-info { flex: 1; overflow: hidden; }
    .user-name { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-email { font-size: 13px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .status-pill {
      font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 9999px;
    }
    .status-pill.active { background: #d4edda; color: #155724; }
    .status-pill.inactive { background: var(--color-surface); color: var(--color-text-muted); }
    .toggle-btn {
      padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      border: 1.5px solid var(--color-border); background: transparent; color: var(--color-text);
    }
    .pagination { display: flex; justify-content: center; gap: 16px; margin-top: 16px; }
    .page-btn { padding: 8px 16px; border: 1.5px solid var(--color-border); border-radius: 8px; cursor: pointer; background: transparent; }
    .page-btn:disabled { opacity: 0.4; cursor: default; }
  `

  constructor() {
    super()
    this._users = []
    this._total = 0
    this._page = 1
    this._loading = false
    this._query = ''
    this._dashUrl = 'https://dashboard.clerk.com'
  }

  connectedCallback() {
    super.connectedCallback()
    this._load()
    this._loadDashUrl()
  }

  async _load() {
    this._loading = true
    try {
      const res = await apiFetch(`/api/admin/users?page=${this._page}&limit=25`)
      if (res.ok) {
        const body = await res.json()
        this._users = body.users
        this._total = body.total
      }
    } catch (_) {}
    this._loading = false
  }

  async _loadDashUrl() {
    const res = await apiFetch('/api/admin/clerk-dashboard-url')
    if (res.ok) {
      const body = await res.json()
      this._dashUrl = body.url
    }
  }

  async _toggleStatus(userId, currentlyActive) {
    const res = await apiFetch(`/api/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ active: !currentlyActive }),
    })
    if (res.ok) this._load()
  }

  get _filtered() {
    if (!this._query) return this._users
    const q = this._query.toLowerCase()
    return this._users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }

  _avatarColor(userId) {
    const colors = ['#3ab5ad', '#5abf7a', '#e8964d', '#e05252', '#c8c84a']
    let hash = 0
    for (const c of userId) hash = (hash + c.charCodeAt(0)) % colors.length
    return colors[hash]
  }

  _initials(name) {
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  }

  render() {
    const filtered = this._filtered
    const activeCount = this._users.filter((u) => u.active).length

    return html`
      <h1>Gebruikersbeheer</h1>

      <div class="stats-row">
        <div class="stat-block"><div class="stat-num">${this._total}</div><div class="stat-label">Gebruikers</div></div>
        <div class="stat-block"><div class="stat-num">${activeCount}</div><div class="stat-label">Actief</div></div>
      </div>

      <input class="search-input" type="search" placeholder="Zoek gebruikers..."
        .value=${this._query} @input=${(e) => { this._query = e.target.value }}
        aria-label="Zoek gebruikers" />

      <a class="clerk-link" href="${this._dashUrl}" target="_blank" rel="noopener">
        Clerk Dashboard ↗
      </a>

      ${filtered.map((user) => html`
        <div class="user-card">
          <div class="avatar" style="background:${user.active ? this._avatarColor(user.userId) : 'var(--color-text-muted)'}">
            ${this._initials(user.name)}
          </div>
          <div class="user-info">
            <div class="user-name">${user.name}</div>
            <div class="user-email">${user.email}</div>
          </div>
          <span class="status-pill ${user.active ? 'active' : 'inactive'}">${user.active ? 'Actief' : 'Inactief'}</span>
          <button class="toggle-btn"
            @click=${() => this._toggleStatus(user.userId, user.active)}
            aria-label="${user.active ? 'Deactiveer' : 'Activeer'} ${user.name}">
            ${user.active ? 'Deactiveer' : 'Activeer'}
          </button>
        </div>
      `)}

      <div class="pagination">
        <button class="page-btn" ?disabled=${this._page <= 1}
          aria-label="Vorige pagina"
          @click=${() => { this._page--; this._load() }}>&#8249;</button>
        <span>Pagina ${this._page}</span>
        <button class="page-btn" ?disabled=${this._page * 25 >= this._total}
          aria-label="Volgende pagina"
          @click=${() => { this._page++; this._load() }}>&#8250;</button>
      </div>
    `
  }
}

customElements.define('admin-screen', AdminScreen)
