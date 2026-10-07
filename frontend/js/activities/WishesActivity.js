import { saveWishes } from '../api/wishesApi.js';
import { experience } from '../data/config.js';
import { observeStageHeader } from '../effects/ScrollReveal.js';

const questions = [
  { key: 'place', label: 'Si pudieras escoger un lugar de CDMX para ir conmigo, ¿a dónde iríamos?' },
  { key: 'gift', label: '¿Qué regalo te gustaría recibir algún día?' },
  { key: 'topic', label: '¿De qué tema podrías hablar conmigo durante horas?' },
  { key: 'message', label: '¿Quieres dejarme un mensaje?', optional: true },
];

export class WishesActivity {
  constructor(bus) { this.bus = bus; this.abort = new AbortController(); this.answers = { place: '', gift: '', topic: '', message: '' }; this.index = 0; this.saved = false; this.moving = false; this.timers = new Set(); }
  init(screen) {
    this.screen = screen;
    const head = document.createElement('div');
    head.className = 'stage-head';
    head.innerHTML = `<span class="eyebrow">04 / UNA PAUSA CONTIGO</span><h2>Cosas que quiero<br><em>saber de ti</em></h2><p>Ahora quiero escucharte a ti. Respóndeme con calma.</p>`;
    this.card = document.createElement('div');
    this.card.className = 'note-card wishes-card';
    screen.append(head, this.card);
    this.headObserver = observeStageHeader(head);
    this.render();
  }
  start() {}
  render() {
    this.card.replaceChildren();
    if (this.saved) { this.renderSuccess(); return; }
    if (this.index >= questions.length) { this.renderReview(); return; }
    const question = questions[this.index];
    const count = document.createElement('p');
    count.className = 'question-count';
    count.textContent = `PREGUNTA ${this.index + 1} DE ${questions.length}`;
    const progress = document.createElement('div');
    progress.className = 'question-progress';
    progress.setAttribute('aria-hidden', 'true');
    questions.forEach((_, step) => {
      const marker = document.createElement('span');
      marker.className = `question-step ${step <= this.index ? 'is-reached' : ''} ${step === this.index ? 'is-current' : ''}`;
      marker.textContent = String(step + 1).padStart(2, '0');
      progress.append(marker);
    });
    const label = document.createElement('label');
    label.htmlFor = 'wish-answer';
    label.textContent = question.label;
    if (question.optional) {
      const optional = document.createElement('small');
      optional.className = 'question-optional';
      optional.textContent = 'Opcional';
      label.append(optional);
    }
    const input = document.createElement('textarea');
    input.id = 'wish-answer';
    input.maxLength = question.key === 'message' ? 2000 : 300;
    input.placeholder = question.key === 'message' ? 'Escríbeme lo que quieras...' : 'Escribe lo que se te ocurra...';
    input.value = this.answers[question.key];
    const status = document.createElement('p');
    status.className = 'wishes-status';
    status.setAttribute('role', 'status');
    const actions = document.createElement('div');
    actions.className = 'wishes-actions';
    const back = document.createElement('button');
    back.className = 'text-button';
    back.type = 'button';
    back.textContent = this.index > 0 ? '← Anterior' : '';
    back.hidden = this.index === 0;
    back.addEventListener('click', () => { this.answers[question.key] = input.value; this.stepTo(this.index - 1); }, { signal: this.abort.signal });
    const next = document.createElement('button');
    next.className = 'btn';
    next.type = 'button';
    next.textContent = this.index === questions.length - 1 ? 'Ver mis respuestas →' : 'Siguiente →';
    next.addEventListener('click', () => {
      const answer = question.key === 'message' ? input.value.trim() : input.value.replace(/\s+/g, ' ').trim();
      if (!answer && !question.optional) { status.textContent = 'Escribe una respuesta antes de continuar.'; input.focus(); return; }
      this.answers[question.key] = answer;
      this.stepTo(this.index + 1, experience.answerAcknowledgement);
    }, { signal: this.abort.signal });
    actions.append(back, next);
    this.card.append(count, progress, label, input, status, actions);
  }
  stepTo(index, acknowledgement = '') {
    if (this.moving) return;
    this.moving = true;
    if (acknowledgement) this.card.querySelector('.wishes-status').textContent = acknowledgement;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.abort.signal.aborted) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const exit = reduced ? null : this.card.animate([
        { opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: 'translateX(-15px)' },
      ], { duration: 220, easing: 'ease-in', fill: 'forwards' });
      this.motion = exit;
      const finish = () => {
        if (this.abort.signal.aborted) return;
        exit?.cancel();
        this.index = index;
        this.render();
        if (!reduced) this.motion = this.card.animate([
          { opacity: 0, transform: 'translateX(15px)' },
          { opacity: 1, transform: 'translateX(0)' },
        ], { duration: 320, easing: 'ease-out' });
        this.moving = false;
      };
      if (exit) exit.finished.then(finish).catch(() => {});
      else finish();
    }, acknowledgement ? 620 : 0);
    this.timers.add(timer);
  }
  renderReview() {
    const title = document.createElement('h3');
    title.textContent = 'Me encantará leer esto 💛';
    const review = document.createElement('div');
    review.className = 'wishes-review';
    questions.filter(question => !question.optional || this.answers[question.key]).forEach(question => {
      const item = document.createElement('div');
      item.className = 'review-answer';
      const label = document.createElement('strong');
      label.textContent = question.label;
      const answer = document.createElement('span');
      answer.textContent = this.answers[question.key];
      item.append(label, answer);
      review.append(item);
    });
    const status = document.createElement('p');
    status.className = 'wishes-status';
    status.setAttribute('role', 'status');
    const actions = document.createElement('div');
    actions.className = 'wishes-actions';
    const back = document.createElement('button');
    back.className = 'text-button';
    back.textContent = '← Editar';
    back.addEventListener('click', () => { this.index = questions.length - 1; this.render(); }, { signal: this.abort.signal });
    const save = document.createElement('button');
    save.className = 'btn';
    save.textContent = 'Guardar mis respuestas 💛';
    save.addEventListener('click', async () => {
      save.disabled = true;
      back.disabled = true;
      status.textContent = 'Guardando tus respuestas…';
      try {
        await saveWishes(this.answers);
        if (this.abort.signal.aborted) return;
        this.saved = true;
        this.answers = { place: '', gift: '', topic: '', message: '' };
        this.render();
      } catch (error) {
        if (this.abort.signal.aborted) return;
        status.textContent = error.message;
        save.disabled = false;
        back.disabled = false;
      }
    }, { signal: this.abort.signal });
    actions.append(back, save);
    this.card.append(title, review, status, actions);
  }
  renderSuccess() {
    const title = document.createElement('h3');
    title.textContent = 'Guardado con cariño 💛';
    const copy = document.createElement('p');
    copy.textContent = 'Abril lo va a tener en cuenta 💛';
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = 'Una última cosa →';
    button.addEventListener('click', () => this.complete(), { signal: this.abort.signal });
    this.card.append(title, copy, button);
  }
  complete() { this.bus.emit('activity:completed'); }
  destroy() { this.abort.abort(); this.timers.forEach(clearTimeout); this.timers.clear(); this.motion?.cancel(); this.headObserver?.disconnect(); this.answers = { place: '', gift: '', topic: '', message: '' }; }
}
