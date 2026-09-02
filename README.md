# WhatsApp Auto-Agent v2

This version includes an actual WhatsApp Web connector using `whatsapp-web.js`, QR display, catalog, plans, quantity, order creation and admin panel.

## Local
Node.js 18+:
npm install
npm start
Open http://localhost:3000

## Hosting warning
The WhatsApp browser/session requires a persistent Node.js runtime and writable storage. Vercel/serverless is not suitable. Free hosts may sleep/restart or restrict Chromium, so QR/session persistence is not guaranteed.

## Security
Add authentication before exposing the admin panel publicly. Do not put payment secrets or credentials in public GitHub repositories.

## WhatsApp risk
This uses an unofficial WhatsApp Web automation library. Account restrictions or logout can occur. Use at your own risk.
