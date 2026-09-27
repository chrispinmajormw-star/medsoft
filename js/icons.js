// Inline SVG icons. Put <span data-icon="name"></span> in HTML and call hydrateIcons().
const s = (w, body, extra = '') =>
  `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ${extra} aria-hidden="true">${body}</svg>`;

export const ICON = {
  home: s(19, '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
  find: s(17, '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  saved: s(19, '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'),
  profile: s(19, '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/>'),
  bookmark: s(17, '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>'),
  bookmarkFill: s(17, '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" fill="currentColor"/>'),
  back: s(18, '<path d="M15 18l-6-6 6-6"/>', 'stroke-width="2.2"'),
  map: s(17, '<path d="M9 20l-6 2V6l6-2 6 2 6-2v16l-6 2-6-2z"/><path d="M9 4v16M15 6v16"/>'),
  list: s(17, '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
  phone: s(15, '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 3a2 2 0 0 1-.4 2.1L8 10.3a16 16 0 0 0 6 6l1.5-1.4a2 2 0 0 1 2.1-.4c1 .3 2 .5 3 .7a2 2 0 0 1 1.7 2z"/>'),
  dir: s(15, '<path d="M5 12h14M13 6l6 6-6 6"/>', 'stroke-width="2.2"'),
  info: s(16, '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12.01" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/>'),
  check: s(14, '<polyline points="20 6 9 17 4 12"/>', 'stroke-width="3"'),
  star: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9"/></svg>',
  pill: s(16, '<rect x="3" y="10.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 14)"/><line x1="8.5" y1="15.5" x2="15.5" y2="8.5"/>'),
  clock: s(16, '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>'),
  heart: s(16, '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>'),
  target: s(18, '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>'),
  logout: s(17, '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'),
};

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    if (!el.firstElementChild) el.innerHTML = ICON[el.dataset.icon] || '';
  });
}
