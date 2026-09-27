import { store, displayName } from '../store.js';
import { CONFIG } from '../config.js';
import { ICON } from '../icons.js';
import { esc } from '../utils.js';

let authTab = 'signin';
export const setAuthTab = tab => { authTab = tab; };

function locationRow() {
  const label = store.positionSource === 'device' ? 'Your current location' : `${CONFIG.DEFAULT_LOCATION.label} (default)`;
  return `<button class="menu-row" data-action="locate">${ICON.target}<span>Use my location</span><small>${esc(label)}</small></button>`;
}

function aboutBlock() {
  return `<p class="fine-print">${esc(CONFIG.APP_NAME)} shows pharmacies and hospitals near you. Stock and hours can change, so call ahead before you travel.</p>`;
}

function demoView() {
  return `
    <div class="card prof-card"><div class="avatar">M</div><h3>Guest</h3><p>${esc(CONFIG.DEFAULT_LOCATION.label)}</p></div>
    <div class="card panel"><h3>Accounts are off</h3>
      <p style="margin:0;font-size:13px;color:var(--ink-soft)">This copy is running on sample data. Add your Supabase URL and anon key to <b>js/config.js</b> to turn on sign-in and synced saved places.</p>
    </div>
    <div class="card menu-list">${locationRow()}</div>${aboutBlock()}`;
}

function authView() {
  const signup = authTab === 'signup';
  return `
    <div class="card panel">
      <div class="auth-tabs" role="tablist">
        <button role="tab" data-action="auth-tab" data-tab="signin" class="${signup ? '' : 'active'}" aria-selected="${!signup}">Sign in</button>
        <button role="tab" data-action="auth-tab" data-tab="signup" class="${signup ? 'active' : ''}" aria-selected="${signup}">Create account</button>
      </div>
      <form class="form" id="authForm" novalidate>
        ${signup ? '<label class="field">Full name<input name="full_name" autocomplete="name" required></label>' : ''}
        <label class="field">Email<input name="email" type="email" autocomplete="email" required></label>
        <label class="field">Password<input name="password" type="password" minlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}" required></label>
        <p class="form-error" id="authError"></p>
        <button class="btn btn-block" type="submit">${signup ? 'Create account' : 'Sign in'}</button>
      </form>
    </div>
    <div class="card menu-list">${locationRow()}</div>${aboutBlock()}`;
}

function accountView() {
  const name = displayName();
  return `
    <div class="card prof-card">
      <div class="avatar">${esc((name || 'M').charAt(0).toUpperCase())}</div>
      <h3>${esc(name || 'Your account')}</h3>
      <p>${esc(store.profile?.city || store.user.email)}</p>
    </div>
    <div class="card panel">
      <h3>Your details</h3>
      <form class="form" id="profileForm">
        <label class="field">Full name<input name="full_name" autocomplete="name" value="${esc(store.profile?.full_name || '')}"></label>
        <label class="field">City<input name="city" autocomplete="address-level2" value="${esc(store.profile?.city || '')}" placeholder="${esc(CONFIG.DEFAULT_LOCATION.label)}"></label>
        <p class="form-error" id="profileError"></p>
        <button class="btn btn-block" type="submit">Save changes</button>
      </form>
    </div>
    <div class="card menu-list">
      <button class="menu-row" data-action="go" data-screen="saved">${ICON.saved}<span>Saved places</span><small>${store.saved.size}</small></button>
      ${locationRow()}
      <button class="menu-row" data-action="sign-out">${ICON.logout}<span>Sign out</span><small>${esc(store.user.email)}</small></button>
    </div>${aboutBlock()}`;
}

export function renderProfile() {
  const body = document.getElementById('profileBody');
  body.innerHTML = store.mode === 'demo' ? demoView() : store.user ? accountView() : authView();
}
