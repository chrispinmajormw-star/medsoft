import { ICON } from '../icons.js';

const USER_NAV = [
  { id: 'home', label: 'Home', icon: ICON.home },
  { id: 'find', label: 'Find', icon: ICON.find },
  { id: 'saved', label: 'Saved', icon: ICON.saved },
  { id: 'profile', label: 'Profile', icon: ICON.profile },
];
const MANAGE = { id: 'admin', label: 'Manage', icon: ICON.building };
const SYSADMIN = { id: 'sysadmin', label: 'Admin', icon: ICON.shield };

// Sub-pages highlight their parent tab.
const PARENT = { detail: 'find', settings: 'profile', location: 'profile', 'admin-edit': 'admin', 'admin-stock': 'admin' };

export function renderNavbars(isFacilityAdmin = false, isSystemAdmin = false) {
  const items = [...USER_NAV.slice(0, 3)];
  if (isFacilityAdmin) items.push(MANAGE);
  if (isSystemAdmin) items.push(SYSADMIN);
  items.push(USER_NAV[3]);
  const html = items.map(n =>
    `<button data-action="go" data-screen="${n.id}" data-nav-item="${n.id}">${n.icon}${n.label}</button>`).join('');
  document.querySelectorAll('[data-nav]').forEach(nav => { nav.innerHTML = html; });
}

export function setActiveNav(screen) {
  const active = PARENT[screen] || screen;
  document.querySelectorAll('[data-nav-item]').forEach(b => {
    const on = b.dataset.navItem === active;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
}
