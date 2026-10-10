// Netlify serverless function: calls OpenWeatherMap with a secret key
// stored in the OPENWEATHER_API_KEY environment variable (never sent to the browser).
exports.handler = async (event) => {
  const q = (event.queryStringParameters || {}).q;
  const key = process.env.OPENWEATHER_API_KEY;

  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server API key is not configured' }) };
  }
  if (!q || q.length > 100) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid city' }) };
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&units=metric&appid=${key}`;
  try {
    const res = await fetch(url);
    const body = await res.text();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
      body
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Weather service unavailable' }) };
  }
};
