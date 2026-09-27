// Hash-based router: #/home, #/find, #/detail/3, #/saved, #/profile.
// Works on GitHub Pages (no server rewrites needed) and keeps the back button working.
import { setActiveNav } from './components/navbar.js';

const SCREENS = ['home', 'find', 'detail', 'saved', 'profile'];
const renderers = {};
let internalNavigations = 0;

export function registerScreen(name, render) { renderers[name] = render; }

export function currentRoute() {
  const [, screen = 'home', param = null] = window.location.hash.replace(/^#/, '').split('/');
  return { screen: SCREENS.includes(screen) ? screen : 'home', param: param ? decodeURIComponent(param) : null };
}

export function go(screen, param = null) {
  const hash = param != null ? `#/${screen}/${encodeURIComponent(param)}` : `#/${screen}`;
  if (window.location.hash === hash) { render(); return; }
  internalNavigations++;
  window.location.hash = hash;
}

export function back(fallback = 'find') {
  if (internalNavigations > 0) { internalNavigations--; window.history.back(); }
  else go(fallback);
}

export function render() {
  const { screen, param } = currentRoute();
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === `scr-${screen}`));
  setActiveNav(screen);
  renderers[screen]?.(param);
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}
