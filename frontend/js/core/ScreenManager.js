import { progressIndicator } from '../components/ProgressIndicator.js';

export class ScreenManager {
  constructor(root) { this.root = root; this.current = null; }
  async show(activity, index) {
    if (this.current) {
      this.current.destroy();
      this.root.querySelector('.stage')?.classList.add('is-exiting');
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        await new Promise(resolve => setTimeout(resolve, 380));
      }
    }
    this.root.replaceChildren();
    const screen = document.createElement('section');
    screen.className = 'stage';
    screen.append(progressIndicator(index));
    this.root.append(screen);
    this.current = activity;
    activity.init(screen);
    activity.start();
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.root.focus({ preventScroll: true });
  }
}
