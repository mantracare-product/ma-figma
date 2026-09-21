/**
 * syncBroadcast.ts
 *
 * Centralized cross-window synchronization layer.
 * Uses BroadcastChannel("mantra_assist_sync") to push live updates across
 * separate browser windows (e.g. Admin in Window 1, Patient Front in Window 2),
 * with fallback to window.onstorage for older browsers.
 */

export type SyncEventType =
  | "CLIENTS_UPDATED"
  | "APPOINTMENTS_UPDATED"
  | "DOCUMENTS_UPDATED"
  | "SUBMISSIONS_UPDATED"
  | "PROCESS_UPDATED"
  | "INVOICES_UPDATED"
  | "STAGE_PROGRESS_UPDATED"
  | "VISIT_FEEDBACK_UPDATED";

export interface SyncMessage {
  type: SyncEventType;
  payload?: any;
  senderTimestamp: number;
}

const CHANNEL_NAME = "mantra_assist_sync";
let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

// Local event listeners registry
const listeners = new Map<SyncEventType, Set<(payload?: any) => void>>();

export function broadcastSync(type: SyncEventType, payload?: any) {
  const message: SyncMessage = {
    type,
    payload,
    senderTimestamp: Date.now(),
  };

  // 1. Post to other windows via BroadcastChannel
  try {
    broadcastChannel?.postMessage(message);
  } catch {}

  // 2. Dispatch local custom DOM event for current window
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(`mantra_${type}`, { detail: payload }));
  }

  // 3. Notify local registered callbacks
  const set = listeners.get(type);
  if (set) {
    set.forEach((cb) => cb(payload));
  }
}

export function onSyncEvent(type: SyncEventType, callback: (payload?: any) => void): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(callback);

  // Also listen for local custom DOM events
  const domListener = (e: Event) => {
    callback((e as CustomEvent).detail);
  };
  window.addEventListener(`mantra_${type}`, domListener);

  return () => {
    listeners.get(type)?.delete(callback);
    window.removeEventListener(`mantra_${type}`, domListener);
  };
}

// Initialize channel listener once for cross-window notifications
if (typeof window !== "undefined" && broadcastChannel) {
  broadcastChannel.onmessage = (event: MessageEvent<SyncMessage>) => {
    const data = event.data;
    if (data && data.type) {
      // Dispatch locally in this window so all hooks/stores update
      window.dispatchEvent(new CustomEvent(`mantra_${data.type}`, { detail: data.payload }));
      const set = listeners.get(data.type);
      if (set) {
        set.forEach((cb) => cb(data.payload));
      }
    }
  };

  // Listen to window storage events as fallback
  window.addEventListener("storage", (e) => {
    if (e.key === "clients") {
      broadcastSync("CLIENTS_UPDATED");
    } else if (e.key === "appointments_v1") {
      broadcastSync("APPOINTMENTS_UPDATED");
    } else if (e.key === "clientSavedDocuments") {
      broadcastSync("DOCUMENTS_UPDATED");
    } else if (e.key === "clientFormSubmissions") {
      broadcastSync("SUBMISSIONS_UPDATED");
    }
  });
}
