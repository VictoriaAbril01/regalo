import { heartReasons } from '../data/messages.js';
import { observeStageHeader } from '../effects/ScrollReveal.js';

export class HeartGameActivity {
  constructor(bus) { this.bus = bus; this.abort = new AbortController(); this.timers = new Set(); this.removalTimers = new Set(); this.effects = new Set(); this.foundReasons = []; this.score = 0; this.running = false; }
  init(screen) {
    screen.innerHTML += `<div class="stage-head"><span class="eyebrow">03 / UN JUEGO PEQUEÑITO</span><h2>Atrapa los corazones</h2><p>Tienes 15 segundos. Cada corazón guarda una razón para quererte.</p></div><div class="game-shell"><div class="game-status"><span>ENCONTRADOS <span class="game-count" aria-live="polite">0</span></span><span>TIEMPO <span class="game-time">15</span>s</span></div><div class="game-arena"><div class="game-overlay"><div><h3>¿Listo, amor?</h3><p>Toca todos los corazones que puedas. Aquí no hay forma de perder.</p><button class="btn game-start" type="button">Empezar 💛</button></div></div></div><div class="reason-toast" aria-live="polite"></div><section class="game-reasons-panel" hidden><span class="eyebrow">TODAS PARA TI</span><h3>Las razones que atrapaste</h3><ol></ol></section><div class="btn-row"><button class="btn game-continue" type="button" hidden>Continuar 💛 →</button></div></div>`;
    this.arena = screen.querySelector('.game-arena');
    this.overlay = screen.querySelector('.game-overlay');
    this.timeLabel = screen.querySelector('.game-time');
    this.scoreLabel = screen.querySelector('.game-count');
    this.toast = screen.querySelector('.reason-toast');
    this.reasonsPanel = screen.querySelector('.game-reasons-panel');
    this.continueButton = screen.querySelector('.game-continue');
    this.headObserver = observeStageHeader(screen.querySelector('.stage-head'));
    screen.querySelector('.game-start').addEventListener('click', () => this.begin(), { signal: this.abort.signal });
    this.continueButton.addEventListener('click', () => this.complete(), { signal: this.abort.signal });
  }
  start() {}
  every(fn, ms) { const id = setInterval(fn, ms); this.timers.add({ id, kind: 'interval' }); return id; }
  begin() {
    if (this.running) return;
    this.running = true;
    this.overlay.classList.add('hidden');
    this.bus.emit('game:started');
    let time = 15;
    this.spawn();
    this.every(() => this.spawn(), 470);
    this.every(() => { time--; this.timeLabel.textContent = String(time); if (time <= 0) this.finish(); }, 1000);
  }
  spawn() {
    if (!this.running) return;
    const heart = document.createElement('button');
    heart.type = 'button';
    heart.className = 'heart-target';
    heart.textContent = '💛';
    heart.setAttribute('aria-label', 'Atrapar corazón');
    heart.style.setProperty('--x', `${5 + Math.random() * 80}%`);
    heart.style.setProperty('--duration', `${3 + Math.random() * 2}s`);
    heart.style.setProperty('--scale', String(.88 + Math.random() * .24));
    heart.style.setProperty('--rotation', `${Math.round((Math.random() - .5) * 24)}deg`);
    heart.style.setProperty('--drift', `${Math.round((Math.random() - .5) * 50)}px`);
    heart.style.setProperty('--fall-distance', `${this.arena.clientHeight + 140}px`);
    heart.style.setProperty('--reduced-top', `${12 + Math.random() * 70}%`);
    const catchHeart = () => {
      if (!this.running || heart.classList.contains('caught')) return;
      const bounds = heart.getBoundingClientRect();
      const arenaBounds = this.arena.getBoundingClientRect();
      const x = bounds.left - arenaBounds.left;
      const y = bounds.top - arenaBounds.top;
      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      heart.classList.add('caught');
      this.score++;
      this.scoreLabel.textContent = String(this.score);
      const reason = heartReasons[(this.score - 1) % heartReasons.length];
      this.foundReasons.push(reason);
      this.toast.textContent = reason;
      this.celebrateCatch(x + bounds.width / 2, y + bounds.height / 2, reason);
      const timer = setTimeout(() => { this.removalTimers.delete(timer); heart.remove(); }, 260);
      this.removalTimers.add(timer);
    };
    heart.addEventListener('pointerdown', catchHeart, { signal: this.abort.signal });
    heart.addEventListener('click', catchHeart, { signal: this.abort.signal });
    heart.addEventListener('animationend', () => heart.remove(), { signal: this.abort.signal });
    this.arena.append(heart);
  }
  celebrateCatch(x, y, reason) {
    const nodes = [];
    for (let index = 0; index < 4; index++) {
      const spark = document.createElement('span');
      spark.className = 'heart-spark';
      spark.textContent = index % 2 ? '💛' : '✦';
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty('--dx', `${(index - 1.5) * 23}px`);
      spark.style.setProperty('--dy', `${index % 2 ? -24 : -44}px`);
      this.arena.append(spark);
      nodes.push(spark);
      this.effects.add(spark);
    }
    const bubble = document.createElement('span');
    bubble.className = 'heart-reason-float';
    bubble.textContent = reason;
    bubble.style.left = `${Math.max(90, Math.min(this.arena.clientWidth - 90, x))}px`;
    bubble.style.top = `${Math.max(25, y - 20)}px`;
    this.arena.append(bubble);
    nodes.push(bubble);
    this.effects.add(bubble);
    const timer = setTimeout(() => {
      this.removalTimers.delete(timer);
      nodes.forEach(node => { node.remove(); this.effects.delete(node); });
    }, 1150);
    this.removalTimers.add(timer);
  }
  finish() {
    if (!this.running) return;
    this.running = false;
    this.clearTimers();
    this.effects.forEach(node => node.remove());
    this.effects.clear();
    this.arena.querySelectorAll('.heart-target').forEach(heart => {
      const bounds = heart.getBoundingClientRect();
      const arenaBounds = this.arena.getBoundingClientRect();
      heart.style.left = `${bounds.left - arenaBounds.left}px`;
      heart.style.top = `${bounds.top - arenaBounds.top}px`;
      heart.classList.add('game-ending');
      const timer = setTimeout(() => { this.removalTimers.delete(timer); heart.remove(); }, 350);
      this.removalTimers.add(timer);
    });
    this.overlay.querySelector('h3').textContent = 'Todos son para ti 💛';
    this.overlay.querySelector('p').textContent = `Atrapaste ${this.score} ${this.score === 1 ? 'corazón' : 'corazones'}. La razón más grande de todas: Todo tú.`;
    this.overlay.querySelector('button').remove();
    const reasonsList = this.reasonsPanel.querySelector('ol');
    this.foundReasons.forEach(reason => {
      const item = document.createElement('li');
      item.textContent = reason;
      reasonsList.append(item);
    });
    const revealTimer = setTimeout(() => {
      this.removalTimers.delete(revealTimer);
      this.overlay.classList.remove('hidden');
      this.reasonsPanel.hidden = this.foundReasons.length === 0;
      this.continueButton.hidden = false;
      this.bus.emit('game:finished', this.score);
    }, 360);
    this.removalTimers.add(revealTimer);
  }
  clearTimers() { for (const timer of this.timers) clearInterval(timer.id); this.timers.clear(); for (const timer of this.removalTimers) clearTimeout(timer); this.removalTimers.clear(); }
  complete() { this.bus.emit('activity:completed'); }
  destroy() { this.running = false; this.clearTimers(); this.effects.forEach(node => node.remove()); this.effects.clear(); this.headObserver?.disconnect(); this.abort.abort(); }
}
