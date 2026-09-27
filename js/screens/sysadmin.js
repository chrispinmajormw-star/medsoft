// System admin dashboard: review facility listings (approve / reject / suspend) and see totals.
// Only accounts listed in public.system_admins can load this data; the database enforces it.
import { store } from '../store.js';
import { ICON } from '../icons.js';
import * as api from '../api.js';
import { esc, typeLabel, timeAgo, hoursLabel, telUrl, KINDS } from '../utils.js';
import { badge, emptyState, loadingList } from '../components/cards.js';
import { toast } from '../components/toast.js';
import { refreshAfterAdminChange } from '../data.js';

const FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'live', label: 'Live' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'all', label: 'All' },
];

let filter = 'pending';
let list = [];
let stats = null;
let loadToken = 0;

export function reviewState(f) {
  if (f.verified) return f.isActive ? 'live' : 'hidden';
  return f.reviewNote ? 'rejected' : 'pending';
}

const STATE_PILL = {
  pending: '<span class="pill pending">Pending review</span>',
  rejected: '<span class="pill closed">Rejected</span>',
  live: '<span class="pill open">Live</span>',
  hidden: '<span class="pill hidden-pill">Hidden by owner</span>',
};

function statsBar() {
  if (!stats) return '';
  const tile = (n, label, f) =>
    `<button class="stat-tile ${filter === f ? 'active' : ''}" data-action="sysadmin-filter" data-filter="${f}">
      <b>${n}</b><span>${label}</span></button>`;
  return `
    <div class="stat-grid">
      ${tile(stats.pending, 'Pending', 'pending')}
      ${tile(stats.live, 'Live', 'live')}
      ${tile(stats.rejected, 'Rejected', 'rejected')}
    </div>
    <p class="admin-intro">${stats.users} account${stats.users === 1 ? '' : 's'}, of which ${stats.facility_accounts} ${stats.facility_accounts === 1 ? 'is a facility' : 'are facilities'}.${stats.hidden ? ` ${stats.hidden} verified listing${stats.hidden === 1 ? ' is' : 's are'} hidden by the owner.` : ''}</p>`;
}

function chips() {
  const count = id => (id === 'all' ? list.length : list.filter(f => reviewState(f) === id).length);
  return `<div class="chips">${FILTERS.map(f =>
    `<button class="chip ${filter === f.id ? 'active' : ''}" data-action="sysadmin-filter" data-filter="${f.id}">${f.label} (${count(f.id)})</button>`).join('')}</div>`;
}

function reviewCard(f) {
  const state = reviewState(f);
  const counts = KINDS.map(k => `${f.counts[k.id]} ${f.counts[k.id] === 1 ? k.singular : k.plural}`).join(', ');
  const mapUrl = `https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lng}#map=17/${f.lat}/${f.lng}`;
  const approve = `<button class="btn btn-sm" data-action="sysadmin-approve" data-id="${f.id}">${ICON.check} Approve</button>`;
  const reject = `<button class="btn btn-sm btn-outline btn-danger-outline" data-action="sysadmin-reject" data-id="${f.id}">Reject…</button>`;
  const suspend = `<button class="btn btn-sm btn-outline btn-danger-outline" data-action="sysadmin-reject" data-id="${f.id}" data-suspend="1">Suspend…</button>`;
  const actions = state === 'pending' ? approve + reject
    : state === 'rejected' ? approve + reject.replace('Reject…', 'Change reason…')
    : suspend;
  return `
    <div class="card admin-card review-card">
      <div class="rc-top">
        ${badge(f)}
        <div class="rc-title">
          <h4>${esc(f.name)}</h4>
          <p>${typeLabel(f.type)}${f.city ? `, ${esc(f.city)}` : ''}</p>
        </div>
        ${STATE_PILL[state]}
      </div>
      <div class="review-facts">
        <div><span>Submitted by</span><span>${esc(f.ownerName || 'No owner')}${f.ownerEmail ? `<br><small>${esc(f.ownerEmail)}</small>` : ''}</span></div>
        <div><span>Phone</span><span>${f.phone ? `<a href="${telUrl(f.phone)}">${esc(f.phone)}</a>` : 'Not given'}</span></div>
        <div><span>Address</span><span>${esc(f.address || 'Not given')}</span></div>
        <div><span>Hours</span><span>${hoursLabel(f)}</span></div>
        <div><span>Listed</span><span>${esc(counts)}</span></div>
        <div><span>Added</span><span>${timeAgo(f.createdAt)}${f.reviewedAt ? `, reviewed ${timeAgo(f.reviewedAt)}` : ''}</span></div>
      </div>
      ${f.reviewNote ? `<p class="review-note"><b>Reason given:</b> ${esc(f.reviewNote)}</p>` : ''}
      <div class="admin-actions">
        ${actions}
        <a class="btn btn-sm btn-outline" href="${mapUrl}" target="_blank" rel="noopener">${ICON.mapPin} Location</a>
      </div>
    </div>`;
}

function paint() {
  const body = document.getElementById('sysadminBody');
  const shown = filter === 'all' ? list : list.filter(f => reviewState(f) === filter);
  const emptyText = {
    pending: 'Nothing waiting for review.',
    rejected: 'No rejected listings.',
    live: 'No live listings yet.',
    hidden: 'No hidden listings.',
    all: 'No facilities yet.',
  }[filter];
  body.innerHTML = `
    ${statsBar()}
    ${chips()}
    <div class="list-wrap">${shown.length ? shown.map(reviewCard).join('') : emptyState('shield', emptyText)}</div>`;
}

export async function renderSysadmin() {
  const body = document.getElementById('sysadminBody');
  if (store.mode !== 'live' || !store.user || !store.isSystemAdmin) {
    body.innerHTML = emptyState('shield', 'This area is for system admins only.',
      '<button class="btn btn-sm" data-action="go" data-screen="home">Go home</button>');
    return;
  }
  if (!stats) body.innerHTML = `<div class="list-wrap" style="padding-top:8px">${loadingList(3)}</div>`;
  const token = ++loadToken;
  try {
    const [nextList, nextStats] = await Promise.all([api.adminListFacilities(), api.adminStats()]);
    if (token !== loadToken) return; // a newer load started
    list = nextList;
    stats = nextStats;
    paint();
  } catch (err) {
    if (token !== loadToken) return;
    body.innerHTML = emptyState('info', `The admin data could not be loaded.<br>${esc(err.message || '')}`,
      '<button class="btn btn-sm" data-action="sysadmin-reload">Try again</button>');
  }
}

async function afterReview(message) {
  toast(message);
  await Promise.all([renderSysadmin(), refreshAfterAdminChange()]);
}

export const sysadminActions = {
  'sysadmin-filter': el => { filter = el.dataset.filter; paint(); },
  'sysadmin-reload': () => renderSysadmin(),
  'sysadmin-approve': async el => {
    const f = list.find(x => x.id === Number(el.dataset.id));
    if (!f) return;
    el.disabled = true;
    try {
      await api.adminReview(f.id, true);
      await afterReview(`${f.name} is now live on the map.`);
    } catch (err) {
      el.disabled = false;
      toast(err.message || 'Could not approve.');
    }
  },
  'sysadmin-reject': async el => {
    const f = list.find(x => x.id === Number(el.dataset.id));
    if (!f) return;
    const suspend = Boolean(el.dataset.suspend);
    const reason = prompt(
      `${suspend ? 'Suspend' : 'Reject'} "${f.name}"?\n\nWrite the reason. The facility will see it in their dashboard.`,
      f.reviewNote || '');
    if (reason === null) return;
    if (!reason.trim()) { toast('Add a reason so the facility knows what to fix.'); return; }
    try {
      await api.adminReview(f.id, false, reason.trim());
      await afterReview(`${f.name} ${suspend ? 'suspended' : 'rejected'}.`);
    } catch (err) {
      toast(err.message || 'Could not save.');
    }
  },
};
