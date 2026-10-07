export class EventBus {
  #listeners = new Map();
  on(name, handler) {
    if (!this.#listeners.has(name)) this.#listeners.set(name, new Set());
    this.#listeners.get(name).add(handler);
    return () => this.#listeners.get(name)?.delete(handler);
  }
  emit(name, detail) {
    this.#listeners.get(name)?.forEach(handler => handler(detail));
  }
}
