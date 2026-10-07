export async function downloadLetterPdf(letter, signal) {
  const response = await fetch('/api/letter.pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ letter }),
    signal,
  });
  if (!response.ok) throw new Error('No se pudo preparar la carta. Inténtalo de nuevo.');
  const file = await response.blob();
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Carta_para_Sebastian.pdf';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
