/** Single-use token for browser Scribe Realtime WebSocket (keeps API key server-side). */

export async function createScribeRealtimeToken(): Promise<{ token: string }> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('Server is missing ELEVENLABS_API_KEY');

  const response = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
    method: 'POST',
    headers: { 'xi-api-key': key },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Scribe token failed (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) throw new Error('Scribe token response missing token');
  return { token: data.token };
}
