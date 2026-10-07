export async function saveWishes(answers) {
  const response = await fetch('/api/wishes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers),
  });
  if (!response.ok) throw new Error('No pudimos completar tus respuestas. Inténtalo de nuevo.');
  return response.json();
}
