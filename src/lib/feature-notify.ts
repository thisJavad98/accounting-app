const PORTFOLIO_FLAG = "dakhl:whats-new:portfolio-v1";
const PORTFOLIO_URL = "/app/reports/savings";

export function hasSeenPortfolioWhatsNew() {
  try {
    return localStorage.getItem(PORTFOLIO_FLAG) === "1";
  } catch {
    return true;
  }
}

export function markPortfolioWhatsNewSeen() {
  try {
    localStorage.setItem(PORTFOLIO_FLAG, "1");
  } catch {
    /* private mode */
  }
}

/** System notification when permission is already granted (no prompt). */
export async function showPortfolioPush(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.ready : null;
    const options: NotificationOptions = {
      body,
      icon: "/icons/192",
      badge: "/icons/192",
      tag: "dakhl-portfolio-v1",
      data: { url: PORTFOLIO_URL },
    };
    if (reg?.showNotification) {
      await reg.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    /* iOS / denied mid-flight */
  }
}

export { PORTFOLIO_URL };
