import { store, displayName, isFacilityAdmin } from '../store.js';
import { CONFIG } from '../config.js';
import { ICON } from '../icons.js';
import { esc } from '../utils.js';

let authTab = 'signin';
export const setAuthTab = tab => { authTab = tab; };

function locationRow() {
  const label = store.positionSource === 'device' ? 'Your current location' : `${CONFIG.DEFAULT_LOCATION.label} (default)`;
  return `<button class="menu-row" data-action="locate">${ICON.target}<span>Use my location</span><small>${esc(label)}</small></button>`;
}
const settingsRow = () => `<button class="menu-row" data-action="go" data-screen="settings">${ICON.settings}<span>Settings</span></button>`;

function aboutBlock() {
  return `<p class="fine-print">${esc(CONFIG.APP_NAME)} shows pharmacies, clinics and hospitals near you. Stock and hours can change, so call ahead before you travel.</p>`;
}

function demoView() {
  return `
    <div class="card prof-card"><div class="avatar">M</div><h3>Guest</h3><p>${esc(CONFIG.DEFAULT_LOCATION.label)}</p></div>
    <div class="card panel"><h3>Accounts are off</h3>
      <p class="panel-text">This copy is running on sample data. Add your Supabase URL and anon key to <b>js/config.js</b> to turn on accounts, facility listings and synced saved places.</p>
    </div>
    <div class="card menu-list">${settingsRow()}${locationRow()}</div>${aboutBlock()}`;
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
        ${signup ? `
        <fieldset class="account-type">
          <legend>Account type</legend>
          <label class="choice"><input type="radio" name="account_type" value="user" checked>
            <span>I'm looking for care<small>Find places, check stock and save favourites.</small></span></label>
          <label class="choice"><input type="radio" name="account_type" value="facility_admin">
            <span>I run a pharmacy, clinic or hospital<small>List your facility and keep its stock up to date.</small></span></label>
        </fieldset>
        <label class="field">Full name<input name="full_name" autocomplete="name" required></label>` : ''}
        <label class="field">Email<input name="email" type="email" autocomplete="email" required></label>
        <label class="field">Password<input name="password" type="password" minlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}" required></label>
        <p class="form-error" id="authError"></p>
        <button class="btn btn-block" type="submit">${signup ? 'Create account' : 'Sign in'}</button>
      </form>
    </div>
    <div class="card menu-list">${settingsRow()}${locationRow()}</div>${aboutBlock()}`;
}

function accountView() {
  const name = displayName();
  const admin = isFacilityAdmin();
  const mine = store.myFacilities[0];
  return `
    <div class="card prof-card">
      <div class="avatar">${esc((name || 'M').charAt(0).toUpperCase())}</div>
      <h3>${esc(name || 'Your account')}</h3>
      <p>${esc(store.profile?.city || store.user.email)}</p>
      <span class="pill ${admin ? 'pending' : 'open'}">${admin ? 'Facility account' : 'User account'}</span>
    </div>
    <div class="card menu-list">
      ${admin
        ? `<button class="menu-row" data-action="go" data-screen="admin">${ICON.building}<span>My facility</span><small>${esc(mine ? mine.name : 'Not added yet')}</small></button>`
        : `<button class="menu-row" data-action="become-admin">${ICON.building}<span>Register a facility</span><small>For pharmacies, clinics, hospitals</small></button>`}
      ${store.isSystemAdmin ? `<button class="menu-row" data-action="go" data-screen="sysadmin">${ICON.shield}<span>System admin</span><small>Review listings</small></button>` : ''}
      <button class="menu-row" data-action="go" data-screen="saved">${ICON.saved}<span>Saved places</span><small>${store.saved.size}</small></button>
      ${settingsRow()}
      ${locationRow()}
      <button class="menu-row" data-action="sign-out">${ICON.logout}<span>Sign out</span><small>${esc(store.user.email)}</small></button>
    </div>${aboutBlock()}`;
}

export function renderProfile() {
  const body = document.getElementById('profileBody');
  body.innerHTML = store.mode === 'demo' ? demoView() : store.user ? accountView() : authView();
}
