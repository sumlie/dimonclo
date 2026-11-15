export async function sendOrderNotification(text: string): Promise<void> {
  const serviceUrl = process.env.NOTIFY_SERVICE_URL;
  const apiKey = process.env.NOTIFY_API_KEY;

  if (!serviceUrl || !apiKey) {
    throw new Error('Notify service is not configured');
  }

  const response = await fetch(
    `${serviceUrl.replace(/\/+$/, '')}/trpc/notify.sendOrder`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({ text }),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    },
  );

  if (!response.ok) {
    throw new Error(`Notify service returned HTTP ${response.status}`);
  }
}
