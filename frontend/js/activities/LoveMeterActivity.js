import { experience } from '../data/config.js';
import { Particles } from '../effects/Particles.js';
import { shake } from '../effects/ScreenShake.js';
import { renderRichText } from '../components/RichText.js';
import { resetStage } from '../core/ProgressStore.js';
import { observeParagraphs } from '../effects/ScrollReveal.js';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export class LoveMeterActivity {
  constructor(bus) { this.bus = bus; this.abort = new AbortController(); this.timers = new Set(); this.effects = new Particles(document.querySelector('#effect-layer')); }
  init(screen) {
    this.screen = screen;
    screen.classList.add('meter-stage');
    screen.innerHTML += `<div class="meter-scene"><span class="eyebrow">05 / LA ÚLTIMA COSA</span><div class="meter-prelude" aria-live="polite">Un momento...</div><div class="meter-main"><h2>Calculando cuánto<br><em>te ama Abril…</em></h2><div class="meter-value" aria-live="polite">0%</div><div class="meter-track" role="progressbar" aria-label="Medidor del amor" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="meter-fill"></div></div><p class="meter-caption">Esto puede tardar un poquito 💛</p></div><div class="meter-final"><span class="ornament">✦ 💛 ✦</span><h2>Creo que rompiste<br><em>el medidor.</em></h2><p>Te amo más de lo que esta página sabe calcular.</p><div class="final-message" aria-label="Mensaje final"></div><div class="btn-row replay-row"><button class="btn btn-light replay-button" type="button">Volver a empezar 💛</button></div></div></div>`;
    this.scene = screen.querySelector('.meter-scene');
    this.prelude = screen.querySelector('.meter-prelude');
    this.main = screen.querySelector('.meter-main');
    this.value = screen.querySelector('.meter-value');
    this.fill = screen.querySelector('.meter-fill');
    this.track = screen.querySelector('.meter-track');
    this.final = screen.querySelector('.meter-final');
    renderRichText(this.final.querySelector('.final-message'), experience.finalMessage);
    const finalLetter = this.final.querySelector('.final-message');
    const choice = [...finalLetter.querySelectorAll('.rich-paragraph')].find(paragraph => paragraph.textContent.trim() === 'Te elijo a ti.');
    if (choice) choice.dataset.emphasis = 'true';
    this.finalObserver = observeParagraphs(finalLetter);
    this.final.querySelector('.replay-button').addEventListener('click', () => this.restart(), { signal: this.abort.signal });
  }
  later(fn, ms) { const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms); this.timers.add(id); }
  start() {
    const factor = reducedMotion() ? .12 : 1;
    this.later(() => { this.prelude.textContent = 'Falta calcular una última cosa.'; }, 1300 * factor);
    this.later(() => { this.prelude.remove(); this.main.classList.add('visible'); }, 2900 * factor);
    const steps = [
      [12, 3900], [37, 4800], [68, 5750], [94, 6650], [100, 7550],
      [101, 9200], [127, 10150], [348, 11150], [999, 12200], ['ERROR', 13300], ['∞%', 14350],
    ];
    steps.forEach(([value, time]) => this.later(() => this.update(value), time * factor));
    this.later(() => this.explode(), 15400 * factor);
  }
  update(value) {
    this.value.textContent = typeof value === 'number' ? `${value}%` : value;
    const amount = typeof value === 'number' ? value : value === '∞%' ? 180 : 160;
    this.fill.style.width = `${Math.min(amount, 175)}%`;
    this.track.setAttribute('aria-valuenow', String(Math.min(amount, 100)));
    if (typeof value === 'number') {
      if (value >= 68) this.scene.classList.add('rising');
      if (value >= 94) this.scene.classList.add('golden');
      if (value === 100) this.scene.classList.add('at-hundred');
      if (value > 100) { this.scene.classList.remove('at-hundred'); this.scene.classList.add('overload'); }
      if (value >= 127) this.scene.classList.add('strained');
      if (value >= 348) this.scene.classList.add('cracked');
      if (value >= 999) this.scene.classList.add('unstable');
    }
    if (value === 'ERROR') { this.scene.classList.remove('unstable'); this.scene.classList.add('error'); this.scene.querySelector('.meter-caption').textContent = 'El medidor no puede continuar…'; if (!reducedMotion()) shake(this.screen); }
    if (value === '∞%') { this.scene.classList.remove('error', 'unstable'); this.scene.classList.add('infinite'); }
  }
  explode() {
    this.scene.classList.remove('unstable');
    this.main.style.visibility = 'hidden';
    if (!reducedMotion()) {
      this.effects.burst();
      shake(this.screen);
      const flash = document.createElement('div');
      flash.className = 'flash';
      document.body.append(flash);
      this.later(() => flash.remove(), 600);
    }
    if (!reducedMotion()) this.later(() => { this.effects.destroy(); this.scene.classList.add('calm'); }, 2100);
    this.later(() => { this.main.remove(); this.final.classList.add('visible'); }, reducedMotion() ? 100 : 2550);
  }
  complete() {}
  restart() {
    resetStage();
    window.location.replace('/');
  }
  destroy() { this.abort.abort(); this.timers.forEach(clearTimeout); this.timers.clear(); this.effects.destroy(); this.finalObserver?.disconnect(); }
}
