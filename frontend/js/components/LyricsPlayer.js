export class LyricsPlayer {
  constructor(host, card) {
    this.host = host;
    this.card = card;
    host.innerHTML = '<span class="eyebrow">LETRA</span><div class="lyrics-viewport"><div class="lyrics-track"></div></div>';
    this.viewport = host.querySelector('.lyrics-viewport');
    this.track = host.querySelector('.lyrics-track');
    this.lines = [];
    this.elements = [];
    this.active = -1;
    this.timed = false;
  }

  setSong(data) {
    const source = Array.isArray(data) ? data : Array.isArray(data?.lines) ? data.lines : null;
    this.timed = Boolean(source?.length && source.every(line =>
      typeof line.text === 'string' && Number.isFinite(line.start) && Number.isFinite(line.end) && line.end > line.start
    ));
    this.lines = this.timed ? source : typeof data === 'string'
      ? data.split(/\r?\n/).filter(line => line.trim())
      : (source || []).map(line => line.text).filter(Boolean);
    this.active = -1;
    this.card.classList.remove('has-highlight');
    this.host.classList.toggle('is-timed', this.timed);
    this.host.classList.toggle('is-static', !this.timed);
    this.track.replaceChildren();
    this.track.style.transform = '';
    this.viewport.scrollTop = 0;
    this.elements = this.lines.map(line => {
      const element = document.createElement('div');
      element.className = 'lyric-line';
      const text = document.createElement('span');
      text.className = 'lyric-line-text';
      text.textContent = this.timed ? line.text : line;
      element.append(text);
      if (this.timed && line.highlight === true) {
        element.classList.add('is-highlight-line');
        const heart = document.createElement('span');
        heart.className = 'lyric-heart';
        heart.setAttribute('aria-hidden', 'true');
        heart.textContent = '💛';
        element.append(heart);
      }
      this.track.append(element);
      return element;
    });
    if (this.timed) this.update(0);
  }

  update(time) {
    if (!this.timed) return;
    const next = this.lines.findIndex(line => time >= line.start && time < line.end);
    if (next === this.active) return;
    const previous = this.active;
    const touched = new Set([previous - 1, previous, previous + 1, next - 1, next, next + 1]);
    for (const index of touched) {
      const element = this.elements[index];
      if (!element) continue;
      element.classList.toggle('is-current', index === next);
      element.classList.toggle('is-previous', index === next - 1);
      element.classList.toggle('is-next', index === next + 1);
    }
    this.active = next;
    this.card.classList.toggle('has-highlight', next >= 0 && this.lines[next].highlight === true);
    const center = next >= 0 ? next : this.lines.findIndex(line => line.start > time);
    const target = this.elements[Math.max(0, center)];
    if (target) {
      const offset = this.viewport.clientHeight / 2 - (target.offsetTop + target.offsetHeight / 2);
      this.track.style.transform = `translateY(${offset}px)`;
    }
  }

  destroy() {
    this.track.replaceChildren();
    this.elements = [];
    this.lines = [];
  }
}
