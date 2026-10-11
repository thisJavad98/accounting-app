/** Production origin. iOS Shortcuts need an absolute URL that works off the device, never localhost. */
export const SITE_URL = "https://accounting-app-lemon-nine.vercel.app";

/**
 * `webapp://` launches the Home Screen web app instead of Safari. iOS often drops the query on a cold
 * start, so the Shortcut also copies the SMS for pasting by hand in the SMS sheet.
 */
export const SHORTCUT_URL = `${SITE_URL.replace(/^https:/, "webapp:")}/app?sms=`;

/** Plain link for when `webapp://` is rejected; it opens in Safari, whose storage is separate from the web app. */
export const SHORTCUT_SAFARI_URL = `${SITE_URL}/app?sms=`;
