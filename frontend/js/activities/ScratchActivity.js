import { scratchMessages } from '../data/messages.js';
import { observeReveals, observeStageHeader } from '../effects/ScrollReveal.js';

export class ScratchActivity {
  constructor(bus) { this.bus = bus; this.abort = new AbortController(); this.cards = []; }
  init(screen) {
    this.screen = screen;
    const head = document.createElement('div');
    head.className = 'stage-head';
    head.innerHTML = `<span class="eyebrow">02 / TRES PEQUEÑOS SECRETOS</span><h2>Rasca y descubre</h2><p>Hay cosas que me encanta decirte. Descúbrelas con la punta de tus dedos.</p>`;
    const list = document.createElement('div');
    list.className = 'scratch-list';
    scratchMessages.forEach((item, index) => {
      const card = document.createElement('article');
      card.className = 'scratch-item';
      card.dataset.reveal = 'fade';
      card.style.setProperty('--reveal-delay', `${index * 90}ms`);
      const title = document.createElement('h3');
      title.textContent = `${String(index + 1).padStart(2, '0')} · ${item.title}`;
      const surface = document.createElement('div');
      surface.className = 'scratch-surface';
      const message = document.createElement('p');
      message.className = 'placeholder';
      message.textContent = item.message;
      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      surface.append(message, canvas);
      const reveal = document.createElement('button');
      reveal.type = 'button';
      reveal.className = 'text-button';
      reveal.textContent = 'Revelar sin rascar';
      reveal.setAttribute('aria-label', `Revelar ${item.title}`);
      card.append(title, surface, reveal);
      list.append(card);
      this.setupCard(card, canvas, reveal);
    });
    const hint = document.createElement('p');
    hint.className = 'scratch-hint';
    hint.id = 'scratch-hint';
    hint.setAttribute('role', 'status');
    hint.textContent = 'Revela las 3 tarjetas para continuar. Puedes rascar o usar el botón de cada tarjeta.';
    const continueWrap = document.createElement('div');
    continueWrap.className = 'btn-row scratch-complete';
    continueWrap.innerHTML = '<button class="btn" type="button" aria-describedby="scratch-hint" disabled>Continuar 💛 <span aria-hidden="true">→</span></button>';
    this.continueButton = continueWrap.querySelector('button');
    this.continueButton.addEventListener('click', () => this.complete(), { signal: this.abort.signal });
    screen.append(head, list, hint, continueWrap);
    this.headObserver = observeStageHeader(head);
    this.cardsObserver = observeReveals(list);
    this.hint = hint;
  }
  start() { this.cards.forEach(card => card.paint()); }
  setupCard(element, canvas, revealButton) {
    const card = { element, canvas, revealed: false, strokes: 0, pointerDown: false };
    card.paint = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.scale(ratio, ratio);
      const fill = ctx.createLinearGradient(0, 0, bounds.width, bounds.height);
      fill.addColorStop(0, '#a7bdca'); fill.addColorStop(1, '#315e7e');
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, bounds.width, bounds.height);
      ctx.fillStyle = 'rgba(255,254,250,.13)';
      for (let index = 0; index < 18; index++) {
        const x = (index * 73 + 24) % bounds.width;
        const y = (index * 47 + 18) % bounds.height;
        ctx.beginPath();
        ctx.arc(x, y, index % 4 === 0 ? 2 : 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,254,250,.2)';
      ctx.font = '13px Georgia, serif';
      ctx.fillText('✦', bounds.width * .12, bounds.height * .22);
      ctx.fillText('✦', bounds.width * .88, bounds.height * .78);
      ctx.fillStyle = '#fffefa';
      ctx.textAlign = 'center';
      ctx.font = 'italic 22px Georgia, serif';
      ctx.fillText('Rasca aquí ✦', bounds.width / 2, bounds.height / 2 + 8);
      card.ctx = ctx;
    };
    const erase = event => {
      if (!card.pointerDown || card.revealed) return;
      const rect = canvas.getBoundingClientRect();
      card.ctx.globalCompositeOperation = 'destination-out';
      card.ctx.beginPath();
      card.ctx.arc(event.clientX - rect.left, event.clientY - rect.top, 22, 0, Math.PI * 2);
      card.ctx.fill();
      card.strokes++;
      if (card.strokes % 10 === 0) this.checkReveal(card);
    };
    canvas.addEventListener('pointerdown', event => {
      card.pointerDown = true;
      canvas.setPointerCapture(event.pointerId);
      erase(event);
    }, { signal: this.abort.signal });
    canvas.addEventListener('pointermove', erase, { signal: this.abort.signal });
    canvas.addEventListener('pointerup', () => { card.pointerDown = false; this.checkReveal(card); }, { signal: this.abort.signal });
    canvas.addEventListener('pointercancel', () => { card.pointerDown = false; }, { signal: this.abort.signal });
    revealButton.addEventListener('click', () => this.reveal(card), { signal: this.abort.signal });
    this.cards.push(card);
  }
  checkReveal(card) {
    if (card.revealed || !card.ctx) return;
    const { data } = card.ctx.getImageData(0, 0, card.canvas.width, card.canvas.height);
    let clear = 0, sampled = 0;
    for (let pixel = 3; pixel < data.length; pixel += 4 * 24) { sampled++; if (data[pixel] < 70) clear++; }
    if (clear / sampled >= .64) this.reveal(card);
  }
  reveal(card) {
    if (card.revealed) return;
    card.revealed = true;
    card.element.classList.add('revealed');
    card.element.querySelector('.text-button').remove();
    const remaining = this.cards.filter(item => !item.revealed).length;
    this.continueButton.disabled = remaining > 0;
    this.hint.textContent = remaining === 0
      ? 'Ya puedes continuar 💛'
      : `Revela ${remaining} ${remaining === 1 ? 'tarjeta más' : 'tarjetas más'} para continuar.`;
  }
  complete() { this.bus.emit('activity:completed'); }
  destroy() { this.abort.abort(); this.headObserver?.disconnect(); this.cardsObserver?.disconnect(); this.cards.length = 0; }
}
