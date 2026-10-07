export function shake(element) {
  element.classList.remove('shake');
  void element.offsetWidth;
  element.classList.add('shake');
  element.addEventListener('animationend', () => element.classList.remove('shake'), { once: true });
}
