export function progressIndicator(active, total = 5) {
  const nav = document.createElement('div');
  nav.className = 'progress';
  nav.setAttribute('role', 'progressbar');
  nav.setAttribute('aria-label', 'Progreso de la experiencia');
  nav.setAttribute('aria-valuemin', '1');
  nav.setAttribute('aria-valuemax', String(total));
  nav.setAttribute('aria-valuenow', String(active + 1));
  nav.style.setProperty('--progress-scale', String(active / (total - 1)));
  for (let index = 0; index < total; index++) {
    const dot = document.createElement('span');
    dot.className = `progress-dot ${index < active ? 'done' : index === active ? 'active' : ''}`;
    dot.textContent = '💛';
    dot.setAttribute('aria-hidden', 'true');
    nav.append(dot);
  }
  return nav;
}
