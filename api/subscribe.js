// Vercel serverless route: saves a cut with The Catalog through Buttondown's API.
// Needs BUTTONDOWN_API_KEY in the Vercel project's environment variables.
// The page falls back to a plain Buttondown form post when this route is absent.

const BD = 'https://api.buttondown.com/v1/subscribers';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }
  const key = process.env.BUTTONDOWN_API_KEY;
  if (!key) { res.status(503).json({ ok: false, error: 'not configured' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const email = String(body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) { res.status(400).json({ ok: false, error: 'That email does not look right.' }); return; }
  const clean = (v, n) => String(v || '').replace(/[\r\n<>]/g, ' ').trim().slice(0, n);
  const metadata = {
    source: 'canyon-groove',
    'cut-name': clean(body.cut, 60),
    'cut-url': clean(body.url, 400),
    canyon: clean(body.canyon, 60),
    'saved-at': new Date().toISOString(),
  };
  const headers = { Authorization: 'Token ' + key, 'Content-Type': 'application/json' };

  try {
    const r = await fetch(BD, { method: 'POST', headers, body: JSON.stringify({ email_address: email, tags: ['canyon-groove'], metadata }) });
    if (r.status === 201 || r.status === 200) { res.status(200).json({ ok: true, state: 'new' }); return; }
    const j = await r.json().catch(() => ({}));
    const msg = JSON.stringify(j).toLowerCase();
    if (r.status === 400 && (msg.includes('already') || msg.includes('exists') || msg.includes('subscribed'))) {
      // Existing subscriber: attach the cut to their record instead.
      const p = await fetch(BD + '/' + encodeURIComponent(email), { method: 'PATCH', headers, body: JSON.stringify({ metadata }) });
      res.status(200).json({ ok: true, state: p.ok ? 'existing' : 'existing-nometa' }); return;
    }
    res.status(502).json({ ok: false, error: (j && (j.detail || j.error)) || 'Buttondown declined the request.' });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Could not reach Buttondown.' });
  }
}
