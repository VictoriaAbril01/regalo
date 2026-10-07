import { lyrics } from '../data/lyrics.js';
import { featuredVerses } from '../data/featuredVerses.js';
import { LyricsPlayer } from './LyricsPlayer.js';

const formatTime = seconds => {
  if (!Number.isFinite(seconds)) return '--:--';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
};

const icons = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zm7 0h3v14h-3z"/></svg>',
};

export class SongPlayer {
  constructor(songs, host, grid) {
    this.songs = songs;
    this.host = host;
    this.grid = grid;
    this.index = -1;
    this.request = 0;
    this.selection = 0;
    this.scrubbing = false;
    this.abort = new AbortController();
    host.innerHTML = `
      <div class="song-featured" aria-label="Frase destacada de la canción">
        <span class="eyebrow">LA ESTROFA QUE TE DEDICO</span>
        <blockquote class="song-featured-lines"></blockquote>
      </div>
      <div class="song-player-main">
        <div class="song-player-top">
          <div class="song-player-art" aria-hidden="true">
            <img class="song-player-cover" alt="">
            <span class="song-player-record"><span></span></span>
          </div>
          <div class="song-player-heading">
            <span class="eyebrow">SONANDO AHORA</span>
            <strong class="song-player-title"></strong>
            <span class="song-player-artist"></span>
            <span class="song-player-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
          </div>
        </div>
        <audio class="song-audio" preload="metadata"></audio>
        <div class="song-player-controls" aria-label="Controles de reproducción">
          <button type="button" class="song-control song-previous" aria-label="Canción anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h2v14H5zm13 1v12l-9-6z"/></svg></button>
          <button type="button" class="song-control song-play" aria-label="Reproducir">${icons.play}</button>
          <button type="button" class="song-control song-next" aria-label="Canción siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 5h2v14h-2zM6 6v12l9-6z"/></svg></button>
        </div>
        <div class="song-player-timeline">
          <span class="song-time-current">0:00</span>
          <input class="song-seek" type="range" min="0" max="1" step="0.1" value="0" aria-label="Progreso de la canción" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" disabled>
          <span class="song-time-duration">--:--</span>
        </div>
        <p class="song-player-dedication" hidden></p>
        <span class="song-player-status sr-only" role="status"></span>
      </div>
      <div class="song-player-lyrics"></div>
      <div class="song-player-footer"><a class="song-player-spotify" target="_blank" rel="noopener noreferrer">Abrir en Spotify ↗</a></div>`;
    this.audio = host.querySelector('audio');
    this.main = host.querySelector('.song-player-main');
    this.cover = host.querySelector('.song-player-cover');
    this.title = host.querySelector('.song-player-title');
    this.artist = host.querySelector('.song-player-artist');
    this.dedication = host.querySelector('.song-player-dedication');
    this.status = host.querySelector('.song-player-status');
    this.spotify = host.querySelector('.song-player-spotify');
    this.playButton = host.querySelector('.song-play');
    this.seek = host.querySelector('.song-seek');
    this.currentLabel = host.querySelector('.song-time-current');
    this.durationLabel = host.querySelector('.song-time-duration');
    this.featuredLines = host.querySelector('.song-featured-lines');
    this.lyricsPlayer = new LyricsPlayer(host.querySelector('.song-player-lyrics'), host);

    const signal = this.abort.signal;
    this.audio.addEventListener('play', () => { this.status.textContent = 'Reproduciendo'; this.syncControls(); }, { signal });
    this.audio.addEventListener('pause', () => { this.status.textContent = 'En pausa'; this.syncControls(); }, { signal });
    this.audio.addEventListener('ended', () => { this.status.textContent = 'Terminó la canción'; this.syncControls(); }, { signal });
    this.audio.addEventListener('error', () => { this.status.textContent = 'No se pudo reproducir este archivo.'; this.syncControls(); }, { signal });
    this.audio.addEventListener('timeupdate', () => this.syncProgress(), { signal });
    this.audio.addEventListener('durationchange', () => this.syncProgress(), { signal });
    this.audio.addEventListener('loadedmetadata', () => this.syncProgress(), { signal });
    this.playButton.addEventListener('click', () => this.toggle(), { signal });
    host.querySelector('.song-previous').addEventListener('click', () => this.select((this.index - 1 + songs.length) % songs.length), { signal });
    host.querySelector('.song-next').addEventListener('click', () => this.select((this.index + 1) % songs.length), { signal });
    this.seek.addEventListener('input', () => {
      if (!Number.isFinite(this.audio.duration)) return;
      this.audio.currentTime = Number(this.seek.value);
      this.syncProgress();
    }, { signal });
    this.seek.addEventListener('pointerdown', () => { this.scrubbing = true; }, { signal });
    for (const type of ['pointerup', 'pointercancel', 'blur']) {
      this.seek.addEventListener(type, () => { this.scrubbing = false; this.syncProgress(); }, { signal });
    }
  }

  async select(index) {
    if (this.index === index) return this.toggle();
    const song = this.songs[index];
    if (!song) return;
    const hadSong = this.index >= 0;
    const selection = ++this.selection;
    this.request++;
    this.audio.pause();
    this.index = index;
    this.audio.src = song.audio;
    this.audio.load();
    this.host.hidden = false;
    this.status.textContent = 'Cargando…';
    this.scrubbing = false;
    this.syncProgress();
    this.syncControls();
    this.play(); // Se llama dentro del gesto del usuario para permitir reproducción en Android.

    if (hadSong && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.transition?.cancel();
      this.transition = this.main.animate([
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: .3, transform: 'translateY(-5px)' },
      ], { duration: 100, fill: 'forwards', easing: 'ease-in' });
      try { await this.transition.finished; } catch { return; }
      if (selection !== this.selection) return;
      this.transition.cancel();
    }
    if (selection !== this.selection) return;
    this.cover.src = song.photo;
    this.cover.style.transform = song.photoRotation ? `rotate(${song.photoRotation}deg)` : '';
    this.title.textContent = song.title;
    this.artist.textContent = song.artist;
    this.dedication.textContent = song.dedication || '';
    this.dedication.hidden = !song.dedication;
    this.spotify.href = song.spotifyUrl;
    this.renderFeatured(index);
    this.lyricsPlayer.setSong(lyrics[index]);
    this.lyricsPlayer.update(this.audio.currentTime);
    if (hadSong && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.transition = this.main.animate([
        { opacity: .3, transform: 'translateY(7px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration: 300, easing: 'ease-out' });
    }
    this.host.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'nearest' });
  }

  renderFeatured(index) {
    const lines = featuredVerses[index] || [];
    this.featuredLines.replaceChildren(...lines.map((line, lineIndex) => {
      const item = document.createElement('span');
      item.className = 'song-featured-line';
      item.textContent = line;
      item.style.setProperty('--line-delay', `${lineIndex * 100}ms`);
      return item;
    }));
  }

  toggle() {
    if (this.index < 0) return;
    if (this.audio.paused) this.play();
    else this.audio.pause();
  }

  async play() {
    const request = ++this.request;
    try {
      await this.audio.play();
    } catch {
      if (request === this.request) this.status.textContent = 'No se pudo reproducir. Inténtalo de nuevo.';
    }
  }

  syncProgress() {
    const duration = this.audio.duration;
    const current = this.audio.currentTime || 0;
    const validDuration = Number.isFinite(duration) && duration > 0;
    this.currentLabel.textContent = formatTime(current);
    this.durationLabel.textContent = formatTime(duration);
    this.seek.disabled = !validDuration;
    this.seek.max = validDuration ? String(duration) : '1';
    this.seek.setAttribute('aria-valuemax', validDuration ? String(Math.round(duration)) : '0');
    if (!this.scrubbing) this.seek.value = String(current);
    this.seek.setAttribute('aria-valuenow', String(Math.round(current)));
    this.seek.setAttribute('aria-valuetext', `${formatTime(current)} de ${formatTime(duration)}`);
    this.seek.style.setProperty('--seek-progress', validDuration ? `${current / duration * 100}%` : '0%');
    this.lyricsPlayer.update(current);
  }

  syncControls() {
    const playing = this.index >= 0 && !this.audio.paused && !this.audio.ended;
    this.host.classList.toggle('is-playing', playing);
    this.playButton.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
    this.playButton.innerHTML = playing ? icons.pause : icons.play;
    this.grid.querySelectorAll('.song-card').forEach((card, index) => {
      const selected = index === this.index;
      const cardPlaying = selected && playing;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-pressed', String(selected));
      card.setAttribute('aria-label', `${cardPlaying ? 'Pausar' : 'Reproducir'} ${this.songs[index].title} de ${this.songs[index].artist}`);
      card.querySelector('.song-link').textContent = cardPlaying ? 'Pausar ♫' : selected ? 'Seguir escuchando ▶' : 'Reproducir aquí ▶';
    });
  }

  destroy() {
    this.selection++;
    this.request++;
    this.abort.abort();
    this.transition?.cancel();
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    this.lyricsPlayer.destroy();
  }
}
