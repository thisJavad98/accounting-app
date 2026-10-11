# دخل | Dakhl

Mobile-first personal accounting in Persian and English. Every bank SMS becomes an entry, the app asks what it was for, and the month view shows where the money went. There is no backend: all data lives in browser cookies.

Live: [accounting-app-lemon-nine.vercel.app](https://accounting-app-lemon-nine.vercel.app) (landing page), with the app itself at [`/app`](https://accounting-app-lemon-nine.vercel.app/app).

Settings has an install button, light, dark and system themes, language, currency, JSON backup and CSV export.

It is an installable PWA: manifest with maskable icons, screenshots and shortcuts, an Android share target, and a service worker that precaches the app pages so it opens offline. The logo lives in `src/components/logo.tsx`; `src/app/icon.svg` is the favicon and `/icons/{192,512,maskable,apple}` renders the PNG icons from the same mark.

## Run

Requires Node 20.9+.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```

## Getting bank SMS into the app

Browsers cannot read SMS directly, so there are three ways in:

- **Paste**: tap Add, then From bank SMS, and paste the text (or use the clipboard button).
- **Android**: install the app as a PWA, then share an SMS to Dakhl. The manifest `share_target` opens `/app?text=...`.
- **iPhone**: create a Shortcuts automation on messages from your bank that opens `https://accounting-app-lemon-nine.vercel.app/app?sms=[Message]`.

The SMS is read on the device, no server or AI service involved: amount, income or expense, bank, balance, date and time (Jalali or Gregorian), account digits, holder name, a suggested title and a category are extracted automatically. Every incoming SMS is saved right away, then a sheet asks for a title and the reason for the payment. If you tap Later, it stays in the "waiting for a title" banner.

## Storage

Transactions are stored as compact tuples, deflate-compressed, base64-encoded and split across `dk_t0..dk_t2` cookies (3.8 KB each). Cookies are sent with every request and Vercel rejects a `Cookie` header over 16 KB, so storage is capped at ~11 KB, roughly 400-500 entries. Settings warns at 80% and has backup download and restore.
