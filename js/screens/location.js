// "Your location": the user decides where they are. GPS, or a place they pick.
import { store } from '../store.js';
import { ICON } from '../icons.js';
import * as api from '../api.js';
import { esc } from '../utils.js';
import { toast } from '../components/toast.js';
import { back } from '../router.js';
import { applyPosition } from '../data.js';
import { hasLocation, locationSummary, saveLocation, useDeviceLocation } from '../location.js';
import { pickerHTML, mountPicker } from '../components/place-picker.js';

let picker = null;
let pending = null; // { lat, lng, label } chosen on the map, not saved yet

const accountSaver = () => (store.mode === 'live' && store.user
  ? fields => api.saveProfile(store.user.id, fields).then(p => { store.profile = p; })
  : null);

async function commit(loc, message) {
  try {
    await saveLocation(loc, accountSaver());
  } catch (err) {
    // Saved on this device even if the account update failed.
    console.error('Location not saved to account', err);
    toast('Saved on this phone. It could not be saved to your account.', 4000);
  }
  applyPosition();
  if (message) toast(message);
  back('home');
}

export function renderLocation() {
  const body = document.getElementById('locationBody');
  if (picker) { picker.destroy(); picker = null; }
  pending = null;
  body.innerHTML = `
    <div class="card panel">
      <h3>Currently</h3>
      <p class="panel-text">${hasLocation() ? `<b>${esc(locationSummary())}</b>` : 'No location set. Places are listed without distances.'}</p>
      ${hasLocation() ? '<button type="button" class="btn btn-sm btn-outline" data-action="location-clear">Clear my location</button>' : ''}
    </div>

    <div class="card panel">
      <h3>Follow my current location</h3>
      <p class="panel-text">Uses your phone's GPS, and updates each time you open the app.</p>
      <button type="button" class="btn btn-block" data-action="location-gps">${ICON.target} Use my current location</button>
    </div>

    <div class="card panel">
      <h3>Or choose a place</h3>
      <p class="panel-text">For example your home, work, or a town you're travelling to.</p>
      ${pickerHTML('userPicker')}
      <button type="button" class="btn btn-block" id="saveChosenPlace" data-action="location-save" disabled>Save this place</button>
    </div>`;

  const initial = store.positionSource === 'chosen' ? store.position : null;
  picker = mountPicker('userPicker', {
    initial,
    onPick: (lat, lng, label) => {
      pending = { lat, lng, label: label || pending?.label || '' };
      document.getElementById('saveChosenPlace').disabled = false;
    },
  });
}

export const locationActions = {
  'location-gps': async el => {
    el.disabled = true;
    try {
      const loc = await useDeviceLocation();
      await commit(loc, 'Following your current location.');
    } catch (err) {
      toast(`${err.message} You can choose a place on the map instead.`, 4500);
      el.disabled = false;
    }
  },
  'location-save': async () => {
    if (!pending) return;
    await commit({ mode: 'chosen', ...pending }, `Location set${pending.label ? ` to ${pending.label}` : ''}.`);
  },
  'location-clear': async () => {
    await commit(null, 'Location cleared.');
  },
};
