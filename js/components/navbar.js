import { ICON } from '../icons.js';

export const NAV = [
  { id: 'home', label: 'Home', icon: ICON.home },
  { id: 'find', label: 'Find', icon: ICON.find },
  { id: 'saved', label: 'Saved', icon: ICON.saved },
  { id: 'profile', label: 'Profile', icon: ICON.profile },
];

export function renderNavbars() {
  const html = NAV.map(n =>
    `<button data-action="go" data-screen="${n.id}" data-nav-item="${n.id}">${n.icon}${n.label}</button>`).join('');
  document.querySelectorAll('[data-nav]').forEach(nav => { nav.innerHTML = html; });
}

export function setActiveNav(screen) {
  document.querySelectorAll('[data-nav-item]').forEach(b => {
    const on = b.dataset.navItem === screen;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
}
