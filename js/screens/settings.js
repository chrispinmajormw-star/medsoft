// Settings for everyone (appearance, default search radius) and, when signed in,
// personal details, password and account type.
import { store, isFacilityAdmin } from '../store.js';
import { CONFIG } from '../config.js';
import * as api from '../api.js';
import { esc, applyTheme, rememberRadius } from '../utils.js';
import { toast } from '../components/toast.js';
import { go } from '../router.js';

const RADIUS_CHOICES = [1, 2, 5, 10, 15, 25].filter(n => n <= CONFIG.MAX_RADIUS_KM);

export const profileChanged = () => window.dispatchEvent(new CustomEvent('medsoft:profile-changed'));

function preferencesSection() {
  const theme = store.theme || 'system';
  const radius = store.profile?.default_radius_km || store.filters.radius;
  const seg = (value, label) =>
    `<button type="button" data-action="set-theme" data-theme-value="${value}" class="${theme === value ? 'active' : ''}" aria-pressed="${theme === value}">${label}</button>`;
  return `
    <div class="card panel">
      <h3>Preferences</h3>
      <div class="form">
        <div class="field">Appearance
          <div class="segmented">${seg('system', 'Match device')}${seg('light', 'Light')}${seg('dark', 'Dark')}</div>
        </div>
        <label class="field">Default search distance
          <select data-change="default-radius">
            ${RADIUS_CHOICES.map(n => `<option value="${n}" ${n === Number(radius) ? 'selected' : ''}>${n} km</option>`).join('')}
          </select>
        </label>
      </div>
    </div>`;
}

function detailsSection() {
  const p = store.profile || {};
  return `
    <div class="card panel">
      <h3>Your details</h3>
      <form class="form" id="profileForm">
        <label class="field">Full name<input name="full_name" autocomplete="name" value="${esc(p.full_name || '')}"></label>
        <label class="field">Phone<input name="phone" type="tel" autocomplete="tel" value="${esc(p.phone || '')}" placeholder="+265 …"></label>
        <label class="field">City<input name="city" autocomplete="address-level2" value="${esc(p.city || '')}" placeholder="${esc(CONFIG.DEFAULT_LOCATION.label)}"></label>
        <label class="field">Email<input value="${esc(store.user.email)}" disabled></label>
        <p class="form-error" id="profileError"></p>
        <button class="btn btn-block" type="submit">Save changes</button>
      </form>
    </div>`;
}

function passwordSection() {
  return `
    <div class="card panel">
      <h3>Password</h3>
      <form class="form" id="passwordForm" novalidate>
        <label class="field">New password<input name="password" type="password" minlength="6" autocomplete="new-password"></label>
        <label class="field">Confirm new password<input name="confirm" type="password" minlength="6" autocomplete="new-password"></label>
        <p class="form-error" id="passwordError"></p>
        <button class="btn btn-block btn-outline" type="submit">Change password</button>
      </form>
    </div>`;
}

function accountTypeSection() {
  if (isFacilityAdmin()) {
    const canSwitch = store.myFacilities.length === 0;
    return `
      <div class="card panel">
        <h3>Account type</h3>
        <p class="panel-text">Facility admin. You can list pharmacies, clinics and hospitals and update their stock.</p>
        ${canSwitch
          ? '<button class="btn btn-block btn-outline" data-action="become-user">Switch to a user account</button>'
          : '<p class="panel-text">To switch to a user account, delete your facility listings first.</p>'}
      </div>`;
  }
  return `
    <div class="card panel">
      <h3>Account type</h3>
      <p class="panel-text">User account. If you run a pharmacy, clinic or hospital, you can list it and keep its stock up to date.</p>
      <button class="btn btn-block btn-outline" data-action="become-admin">Register a facility</button>
    </div>`;
}

export function renderSettings() {
  const body = document.getElementById('settingsBody');
  const signedIn = store.mode === 'live' && store.user;
  body.innerHTML = preferencesSection()
    + (signedIn ? detailsSection() + passwordSection() + accountTypeSection() : `
      <p class="fine-print">${store.mode === 'live' ? 'Sign in on the Profile tab to edit your details and password.' : 'These preferences are saved on this device.'}</p>`);
}

// ---------- handlers (wired up in app.js) ----------
async function persist(fields) {
  if (!(store.mode === 'live' && store.user)) return;
  try { store.profile = await api.saveProfile(store.user.id, fields); }
  catch (err) { toast(err.message || 'That setting could not be saved.'); }
}

async function setRole(role) {
  try {
    store.profile = await api.saveProfile(store.user.id, { role });
    profileChanged();
    return true;
  } catch (err) {
    toast(err.message || 'Your account type could not be changed.');
    return false;
  }
}

export const settingsActions = {
  'set-theme': async el => {
    store.theme = el.dataset.themeValue;
    applyTheme(store.theme);
    renderSettings();
    await persist({ theme: store.theme });
  },
  'become-admin': async () => {
    if (!store.user) { go('profile'); return; }
    if (!confirm('Register as a facility admin? You will be able to list pharmacies, clinics or hospitals you run.')) return;
    if (await setRole('facility_admin')) { toast('You can now add your facility.'); go('admin-edit', 'new'); }
  },
  'become-user': async () => {
    if (await setRole('user')) { toast('Switched to a user account.'); renderSettings(); }
  },
};

export const settingsChanges = {
  'default-radius': async el => {
    const radius = Number(el.value);
    store.filters.radius = radius;
    rememberRadius(radius);
    await persist({ default_radius_km: radius });
    toast(`Searches now start within ${radius} km.`);
  },
};

export const settingsSubmits = {
  profileForm: async form => {
    const errorEl = document.getElementById('profileError');
    const button = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form));
    errorEl.textContent = '';
    button.disabled = true;
    try {
      store.profile = await api.saveProfile(store.user.id, {
        full_name: data.full_name.trim() || null,
        phone: data.phone.trim() || null,
        city: data.city.trim() || null,
      });
      toast('Changes saved.');
    } catch (err) {
      errorEl.textContent = err.message || 'Changes could not be saved.';
    } finally {
      button.disabled = false;
    }
  },
  passwordForm: async form => {
    const errorEl = document.getElementById('passwordError');
    const button = form.querySelector('button[type="submit"]');
    const { password, confirm: again } = Object.fromEntries(new FormData(form));
    errorEl.textContent = '';
    if (password.length < 6) { errorEl.textContent = 'Use at least 6 characters.'; return; }
    if (password !== again) { errorEl.textContent = 'The two passwords do not match.'; return; }
    button.disabled = true;
    try {
      await api.updatePassword(password);
      form.reset();
      toast('Password changed.');
    } catch (err) {
      errorEl.textContent = err.message || 'Password could not be changed.';
    } finally {
      button.disabled = false;
    }
  },
};
