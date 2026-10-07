const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function observeReveals(container) {
  const elements = [...container.querySelectorAll('[data-reveal]')];
  if (container.matches?.('[data-reveal]')) elements.unshift(container);
  if (!elements.length || !('IntersectionObserver' in window) || reducedMotion()) {
    elements.forEach(element => element.classList.add('is-visible'));
    return { disconnect() {} };
  }
  container.classList.add('reveal-ready');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: .08, rootMargin: '0px 0px -4% 0px' });
  elements.forEach(element => observer.observe(element));
  return observer;
}

export function observeParagraphs(container) {
  container.querySelectorAll('.rich-paragraph').forEach(paragraph => {
    paragraph.dataset.reveal = 'up';
  });
  return observeReveals(container);
}

export function observeStageHeader(head) {
  const parts = [head.querySelector('.eyebrow'), head.querySelector('h1, h2'), head.querySelector('p')];
  parts.forEach((part, index) => {
    if (!part) return;
    part.dataset.reveal = index === 0 ? 'fade' : 'up';
    part.style.setProperty('--reveal-delay', `${index * 110}ms`);
  });
  head.classList.add('editorial-head');
  return observeReveals(head);
}
