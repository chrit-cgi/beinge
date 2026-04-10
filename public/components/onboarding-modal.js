import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js'

class OnboardingModal extends LitElement {
  static styles = css`
    :host([hidden]) { display: none; }
    :host {
      display: flex;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      z-index: 500;
      padding: 24px;
    }
    .modal {
      background: var(--color-bg, #fff);
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 360px;
      width: 100%;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 20px;
      color: var(--color-text, #111);
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: var(--color-text, #111);
      margin-bottom: 12px;
    }
    button {
      margin-top: 24px;
      width: 100%;
      padding: 16px;
      background: var(--color-accent, #3ab5ad);
      color: var(--color-accent-fg, #fff);
      border: none;
      border-radius: 9999px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
  `

  _dismiss() {
    localStorage.setItem('beinge_onboarding_seen', '1')
    this.dispatchEvent(new CustomEvent('dismissed', { bubbles: true, composed: true }))
  }

  render() {
    return html`
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
        <h1 id="modal-heading">Welkom bij beinge</h1>
        <p>Schrijf elke dag een korte notitie over hoe je je voelde.</p>
        <p>Geef je stemming een score van 1 tot 5 met de schuifregelaar.</p>
        <p>Alleen jij kunt jouw notities zien.</p>
        <button @click=${this._dismiss}>Aan de slag →</button>
      </div>
    `
  }
}

customElements.define('onboarding-modal', OnboardingModal)
