export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Log error details if Anthropic returned an error
    if (!response.ok) {
      console.error('Anthropic error:', response.status, JSON.stringify(data));
      return res.status(response.status).json(data);
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: { bodyParser: true },
};