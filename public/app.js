/**
 * app.js — Application controller
 * Handles: auth state, navigation, theme init, drawer, apiFetch
 */

// ── apiFetch ─────────────────────────────────────────────────────────────────

/**
 * Fetch wrapper that injects the Clerk session token as Bearer header.
 * Falls back gracefully when Clerk is not loaded (dev bypass mode).
 */
export async function apiFetch(path, options = {}) {
  let token = null
  try {
    token = await window.Clerk?.session?.getToken()
  } catch (_) { /* dev bypass or Clerk not loaded */ }

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(path, { ...options, headers })
}

// ── Navigation ───────────────────────────────────────────────────────────────

const SCREENS = ['login', 'no-access', 'note', 'overview', 'insights', 'settings', 'admin']

export function navigate(screen, params = {}) {
  // Hide all screens
  for (const id of SCREENS) {
    const el = document.getElementById(`screen-${id}`)
    if (el) el.hidden = true
  }

  // Show target
  const target = document.getElementById(`screen-${screen}`)
  if (target) {
    target.hidden = false
    // Pass params to the web component if supported
    if (params.date && target.tagName) {
      target.setAttribute('entry-date', params.date)
    }
  }

  // Update bottom nav active state
  document.querySelectorAll('#bottomnav .nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screen)
  })

  // Show/hide bottom nav — only for app screens
  const appScreens = ['note', 'overview', 'insights', 'settings', 'admin']
  document.getElementById('bottomnav').hidden = !appScreens.includes(screen)

  closeDrawer()
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export async function initTheme() {
  try {
    const res = await apiFetch('/api/v1/settings')
    if (res.ok) {
      const { theme } = await res.json()
      applyTheme(theme)
    }
  } catch (_) { /* keep default */ }
}

export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.dataset.theme = 'dark'
  } else if (theme === 'light') {
    root.dataset.theme = 'light'
  } else {
    // 'system'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.dataset.theme = prefersDark ? 'dark' : 'light'
  }
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function openDrawer() {
  document.getElementById('drawer-overlay').classList.add('open')
  document.getElementById('drawer').classList.add('open')
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('open')
  document.getElementById('drawer').classList.remove('open')
}

// ── Yesterday helper ─────────────────────────────────────────────────────────

export function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

// ── Dutch date formatter ──────────────────────────────────────────────────────

const DUTCH_MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

/**
 * Format a YYYY-MM-DD string in Dutch.
 * Returns "Gisteren" for yesterday, otherwise "D mmm YYYY" (e.g. "3 apr 2025").
 */
export function formatDutchDate(dateStr) {
  const yStr = yesterday()
  if (dateStr === yStr) return 'Gisteren'
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getDate()} ${DUTCH_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// ── Boot ──────────────────────────────────────────────────────────────────────

async function boot() {
  // Wire up drawer
  document.getElementById('menu-btn').addEventListener('click', openDrawer)
  document.getElementById('drawer-close').addEventListener('click', closeDrawer)
  document.getElementById('drawer-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('drawer-overlay')) closeDrawer()
  })

  // Wire drawer menu items
  document.getElementById('menu-settings').addEventListener('click', () => navigate('settings'))
  document.getElementById('menu-export').addEventListener('click', () => {
    closeDrawer()
    document.getElementById('export-dialog').hidden = false
  })
  document.getElementById('menu-logout').addEventListener('click', async () => {
    await window.Clerk?.signOut()
    location.reload()
  })

  // Wire bottom nav
  document.querySelectorAll('#bottomnav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.screen))
  })

  // Wire overview → note navigation
  document.getElementById('screen-overview')?.addEventListener('open-entry', (e) => {
    navigate('note', { date: e.detail.date })
  })

  // Dev bypass mode — show simple login form
  const devBypass = document.querySelector('meta[name="dev-bypass"]')?.content === 'true'
  if (devBypass) {
    showDevBypassLogin()
    return
  }

  // Load Clerk
  await loadClerk()
}

async function loadClerk() {
  const key = document.querySelector('meta[name="clerk-publishable-key"]')?.content
  if (!key) {
    console.error('Clerk publishable key missing from meta tag')
    navigate('login')
    return
  }

  // Derive the Frontend API host from the publishable key so we load
  // clerk.browser.js from Clerk's own CDN — this ensures UI chunk files
  // are resolved relative to the correct base URL (v6 uses code splitting)
  const encoded = key.split('_').slice(2).join('_')
  const frontendApi = atob(encoded).replace(/\$$/, '')

  await new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://${frontendApi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`
    script.setAttribute('data-clerk-publishable-key', key)
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  await window.Clerk.load()

  window.Clerk.addListener(() => {
    handleAuthState()
  })

  handleAuthState()
}

async function handleAppEntry() {
  try {
    const res = await apiFetch('/api/shell/me')
    if (res.status === 401) { navigate('login'); return }
    if (res.status === 403) { navigate('no-access'); return }

    const { hasEntries } = await res.json()

    // Apply theme before first render to avoid flash
    await initTheme()

    // First-use onboarding
    const seenOnboarding = localStorage.getItem('beinge_onboarding_seen')
    if (!hasEntries && !seenOnboarding) {
      document.getElementById('screen-note').hidden = false
      const modal = document.getElementById('onboarding-modal')
      modal.hidden = false
      modal.addEventListener('dismissed', () => {
        modal.hidden = true
        navigate('note', { date: yesterday() })
      }, { once: true })
    } else {
      navigate('note', { date: yesterday() })
    }
  } catch (err) {
    console.error('Boot error:', err)
    navigate('login')
  }
}

async function handleAuthState() {
  const user = window.Clerk?.user
  if (!user) {
    navigate('login')
    document.getElementById('screen-login').innerHTML = ''
    window.Clerk?.mountSignIn(document.getElementById('screen-login'))
    return
  }

  await handleAppEntry()
}

function showDevBypassLogin() {
  navigate('login')
  document.getElementById('screen-login').innerHTML = `
    <div style="padding: 40px 24px; max-width: 320px; margin: 0 auto;">
      <h1 style="margin-bottom: 24px;">Dev Login</h1>
      <form id="dev-login-form">
        <input type="text" placeholder="Gebruikersnaam (willekeurig)"
               style="width: 100%; padding: 12px; border: 1px solid var(--color-border); border-radius: 8px; margin-bottom: 12px;" />
        <button type="submit"
                style="width: 100%; padding: 14px; background: var(--color-accent); color: var(--color-accent-fg); border-radius: 9999px; font-weight: 600;">
          Inloggen
        </button>
      </form>
    </div>
  `
  document.getElementById('dev-login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    await initTheme()
    await handleAppEntry()
  })
}

boot()
