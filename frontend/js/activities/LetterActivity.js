import { experience } from '../data/config.js';
import { songs } from '../data/songs.js';
import { songCard } from '../components/SongCard.js';
import { SongPlayer } from '../components/SongPlayer.js';
import { renderRichText } from '../components/RichText.js';
import { observeParagraphs, observeStageHeader } from '../effects/ScrollReveal.js';
import { downloadLetterPdf } from '../api/letterApi.js';

export class LetterActivity {
  constructor(bus) { this.bus = bus; this.abort = new AbortController(); this.timers = new Set(); }
  init(screen) {
    screen.classList.add('letter-stage');
    screen.innerHTML += `<div class="intro-copy"><span class="eyebrow">01 / UN COMIENZO</span><h1>Hay algo<br><em>para ti.</em></h1><p>Una pequeña cosa, hecha con todo mi amor.</p></div><div class="envelope-wrap"><button class="envelope-button" type="button" aria-label="Abrir carta"><span class="envelope-back"></span><span class="envelope-letter">Para el amor de mi vida 💛</span><span class="envelope-flap"></span><span class="envelope-front"></span><span class="envelope-seal">💛</span><span class="envelope-label">Para ti 💛</span></button></div>`;
    this.screen = screen;
    this.envelope = screen.querySelector('.envelope-button');
    this.introObserver = observeStageHeader(screen.querySelector('.intro-copy'));
    this.envelope.addEventListener('click', () => this.open(), { signal: this.abort.signal, once: true });
  }
  start() {}
  later(fn, ms) { const timer = setTimeout(() => { this.timers.delete(timer); fn(); }, ms); this.timers.add(timer); }
  open() {
    this.envelope.classList.add('opening');
    this.envelope.disabled = true;
    this.later(() => {
      this.screen.querySelector('.envelope-wrap').remove();
      this.screen.querySelector('.intro-copy').remove();
      const sheet = document.createElement('article');
      sheet.className = 'letter-sheet visible';
      sheet.innerHTML = `<span class="eyebrow">UNA CARTA PARA TI</span><div class="letter-body"></div><div class="letter-download"><button class="btn btn-light" type="button" aria-label="Descargar la carta en PDF">Por si no la quieres perder, descárgala ↓</button><p role="status"></p></div>`;
      renderRichText(sheet.querySelector('.letter-body'), experience.letter);
      sheet.querySelectorAll('.rich-paragraph').forEach(paragraph => {
        if (experience.letterEmphasis?.includes(paragraph.textContent.trim())) paragraph.dataset.emphasis = 'true';
      });
      this.screen.append(sheet);
      const downloadButton = sheet.querySelector('.letter-download button');
      const downloadStatus = sheet.querySelector('.letter-download p');
      downloadButton.addEventListener('click', async () => {
        downloadButton.disabled = true;
        downloadStatus.textContent = 'Preparando tu carta…';
        try {
          await downloadLetterPdf(experience.letter, this.abort.signal);
          downloadStatus.textContent = 'La carta está lista para guardar 💛';
        } catch (error) {
          if (!this.abort.signal.aborted) downloadStatus.textContent = error.message;
        } finally {
          downloadButton.disabled = false;
        }
      }, { signal: this.abort.signal });
      this.revealObserver = observeParagraphs(sheet.querySelector('.letter-body'));
      const songsSection = document.createElement('section');
      songsSection.className = 'songs-section';
      songsSection.innerHTML = `<div class="section-rule">✦</div><span class="eyebrow" style="display:block;text-align:center">UNA BANDA SONORA NUESTRA</span><h2>Canciones para ti</h2><p>Elige una de estas ${songs.length} canciones para escucharla aquí y seguir su letra.</p><div class="song-player" hidden></div><div class="song-grid"></div><div class="btn-row"><button class="btn" type="button">Continuar 💛 <span aria-hidden="true">→</span></button></div>`;
      const grid = songsSection.querySelector('.song-grid');
      this.player = new SongPlayer(songs, songsSection.querySelector('.song-player'), grid);
      songs.forEach((song, index) => grid.append(songCard(song, index, () => this.player.select(index), this.abort.signal)));
      songsSection.querySelector('.btn-row button').addEventListener('click', () => this.complete(), { signal: this.abort.signal });
      this.screen.append(songsSection);
      this.songsObserver = observeStageHeader(songsSection);
      sheet.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 950);
  }
  complete() { this.bus.emit('activity:completed'); }
  destroy() { this.abort.abort(); this.player?.destroy(); this.introObserver?.disconnect(); this.revealObserver?.disconnect(); this.songsObserver?.disconnect(); this.timers.forEach(clearTimeout); this.timers.clear(); }
}
