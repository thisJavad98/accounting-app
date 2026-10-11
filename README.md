# دخل و خرج | Dakhl

Mobile-first personal accounting in Persian and English. Every bank SMS becomes an entry, the app asks what it was for, and the month view shows where the money went. There is no backend: all data lives in browser cookies.

## Run

Requires Node 20.9+.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

`dev` and `start` raise Node's request-header limit, because the cookie storage (up to ~90 KB) is sent with every request.

## Getting bank SMS into the app

Browsers cannot read SMS directly, so there are three ways in:

- **Paste**: tap Add, then From bank SMS, and paste the text (or use the clipboard button).
- **Android**: install the app as a PWA, then share an SMS to Dakhl. The manifest `share_target` opens `/?text=...`.
- **iPhone**: create a Shortcuts automation on messages from your bank that opens `https://<your-domain>/?sms=[Message]`.

Every incoming SMS is saved right away, then a sheet asks for a title and the reason for the payment. If you tap Later, it stays in the "waiting for a title" banner.

## Storage

Transactions are stored as compact tuples, base64-encoded and split across `dk_t0..dk_tN` cookies (3.8 KB each, max 24). Settings has backup download and restore so data can be moved between browsers.
