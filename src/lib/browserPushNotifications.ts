/**
 * browserPushNotifications.ts
 * Path: src/lib/browserPushNotifications.ts
 *
 * Native HTML5 Web Notification API wrapper for background desktop notifications.
 * Respects module permission settings and browser permissions.
 */

export type BrowserNotificationStatus = "granted" | "denied" | "default" | "unsupported";

export function getBrowserNotificationPermission(): BrowserNotificationStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as BrowserNotificationStatus;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    const result = await Notification.requestPermission();
    return result as BrowserNotificationStatus;
  } catch (err) {
    console.error("Failed to request notification permission:", err);
    return getBrowserNotificationPermission();
  }
}

export function sendBrowserNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }
): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  try {
    const notif = new Notification(title, {
      body: options?.body || "",
      icon: options?.icon || "/favicon.ico",
      tag: options?.tag,
      silent: false,
    });

    if (options?.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    } else {
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }

    return true;
  } catch (err) {
    console.error("Failed to display native browser notification:", err);
    return false;
  }
}

