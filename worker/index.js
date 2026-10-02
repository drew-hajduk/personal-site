// Cloudflare Worker: serves the static site and handles the contact form at POST /api/contact.
// Spam protection: Cloudflare Turnstile, a hidden honeypot field, a minimum fill time and length limits.
// Delivery: Cloudflare Email Routing (send_email binding). The recipient is the CONTACT_TO secret, so no
// email address appears in the site or the repository. See README.md for setup.

import { EmailMessage } from 'cloudflare:email';

const MAX = { name: 100, email: 200, message: 5000 };
const MIN_FILL_MS = 3000;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const clean = s => String(s ?? '').replace(/\r\n/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
const b64 = s => { const bytes = new TextEncoder().encode(s); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/.{1,76}/g, '$&\r\n').trimEnd(); };

async function turnstileOk(token, ip, env) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  return res.ok && (await res.json()).success === true;
}

function buildEmail({ from, to, name, email, message }) {
  const host = from.split('@')[1];
  const lines = [
    `From: Website contact form <${from}>`,
    `To: ${to}`,
    `Reply-To: ${email}`,
    'Subject: =?UTF-8?B?' + btoa('New message from drewhajduk.co.uk') + '?=',
    `Message-ID: <${crypto.randomUUID()}@${host}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64(`Name: ${name}\nEmail: ${email}\n\n${message}\n`),
  ];
  return lines.join('\r\n');
}

async function handleContact(request, env) {
  const missing = ['TURNSTILE_SECRET', 'CONTACT_TO', 'CONTACT_FROM', 'EMAIL'].filter(k => !env[k]);
  if (missing.length) console.error('Contact form not set up. Missing:', missing.join(', '));
  if (missing.length) return json({ error: 'The contact form is not set up yet. Please message me on LinkedIn instead.' }, 503);

  let form;
  try { form = await request.formData(); } catch { return json({ error: 'Something went wrong. Please try again.' }, 400); }

  // Honeypot: real visitors never see or fill this field. Pretend success so bots learn nothing.
  if (clean(form.get('website'))) return json({ ok: true });
  const started = Number(form.get('t'));
  if (!started || Date.now() - started < MIN_FILL_MS) return json({ error: 'That was very quick. Please check your message and send it again.' }, 400);

  const name = clean(form.get('name'));
  const email = clean(form.get('email'));
  const message = clean(form.get('message'));
  if (!name || !email || !message) return json({ error: 'Please fill in your name, email and message.' }, 400);
  if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message) return json({ error: 'One of the fields is too long.' }, 400);
  if (!/^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);

  const ip = request.headers.get('CF-Connecting-IP');
  if (!(await turnstileOk(form.get('cf-turnstile-response'), ip, env))) return json({ error: 'The spam check failed. Please refresh the page and try again.' }, 400);

  try {
    const raw = buildEmail({ from: env.CONTACT_FROM, to: env.CONTACT_TO, name, email, message });
    await env.EMAIL.send(new EmailMessage(env.CONTACT_FROM, env.CONTACT_TO, raw));
  } catch (err) {
    console.error('Contact email failed', err && err.message);
    return json({ error: 'Your message could not be sent. Please message me on LinkedIn instead.' }, 502);
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
