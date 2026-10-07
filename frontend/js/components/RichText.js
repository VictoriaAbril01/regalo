export function renderRichText(container, text) {
  const paragraphs = text.trim().split(/\n\s*\n/);
  paragraphs.forEach((paragraph, index) => {
    const element = document.createElement('p');
    element.className = 'rich-paragraph';
    element.style.setProperty('--reveal-delay', `${240 + index * 170}ms`);
    paragraph.split(/(\*\*.*?\*\*)/g).forEach(part => {
      if (!part) return;
      if (part.startsWith('**') && part.endsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2);
        element.append(strong);
      } else {
        element.append(document.createTextNode(part));
      }
    });
    container.append(element);
  });
  return [...container.children];
}
