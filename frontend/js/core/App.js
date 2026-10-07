import { EventBus } from './EventBus.js';
import { ScreenManager } from './ScreenManager.js';
import { LetterActivity } from '../activities/LetterActivity.js';
import { ScratchActivity } from '../activities/ScratchActivity.js';
import { HeartGameActivity } from '../activities/HeartGameActivity.js';
import { WishesActivity } from '../activities/WishesActivity.js';
import { LoveMeterActivity } from '../activities/LoveMeterActivity.js';
import { readStage, saveStage } from './ProgressStore.js';

export class App {
  constructor(root) {
    this.bus = new EventBus();
    this.screens = new ScreenManager(root);
    this.activities = [LetterActivity, ScratchActivity, HeartGameActivity, WishesActivity, LoveMeterActivity];
    this.stage = readStage(this.activities.length);
    this.advancing = false;
    this.bus.on('activity:completed', () => this.advance());
  }
  start() { this.show(); }
  show() {
    const Activity = this.activities[this.stage];
    const showing = this.screens.show(new Activity(this.bus), this.stage);
    this.bus.emit('screen:changed', this.stage);
    return showing;
  }
  async advance() {
    if (this.advancing || this.stage >= this.activities.length - 1) return;
    this.advancing = true;
    this.stage++;
    saveStage(this.stage);
    try { await this.show(); } finally { this.advancing = false; }
  }
}
