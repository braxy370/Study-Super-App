export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(200).json({ status: 'ok', ai: 'missing_key' });
  }

  // Fast check: key exists and is non-empty — report connected.
  // Real validation happens on the first actual chat request,
  // which avoids burning a Gemini API call just for the health badge.
  // If the key turns out to be invalid, the chat endpoint returns
  // a specific error and the frontend updates the badge accordingly.
  return res.status(200).json({ status: 'ok', ai: 'connected' });
}
