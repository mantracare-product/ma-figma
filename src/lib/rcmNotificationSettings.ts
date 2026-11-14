/**
 * Per-event toggles for RCM automation notifications (Slice 6, item 6.3). A `notify` step passes an `eventKey`
 * (default: its rule id); when that key is switched off here the step does nothing. Everything defaults to ON, so
 * only an explicit "off" silences a notification. The list of known events is sample metadata for the settings UI.
 */
import { createObjectStore } from "./refStore";

export const RCM_NOTIFICATION_EVENT = "mantra_rcm_notification_settings_updated";

export const rcmNotificationSettingsStore = createObjectStore<{ disabled: Record<string, boolean> }>(
  "mantra_rcm_notification_settings_v1",
  RCM_NOTIFICATION_EVENT,
  { disabled: {} }
);

export const isRcmNotificationEnabled = (eventKey: string): boolean => !rcmNotificationSettingsStore.get().disabled?.[eventKey];

export function setRcmNotificationEnabled(eventKey: string, enabled: boolean): void {
  const cur = rcmNotificationSettingsStore.get();
  const disabled = { ...(cur.disabled || {}) };
  if (enabled) delete disabled[eventKey];
  else disabled[eventKey] = true;
  rcmNotificationSettingsStore.save({ ...cur, disabled });
}

/** Events the sample rules notify about (rule id -> label). The settings UI lists these. */
export const KNOWN_RCM_NOTIFICATIONS: Array<{ key: string; label: string }> = [
  { key: "sample-rule-A12", label: "Visit in 2 days and authorization not approved (front desk + biller)" },
  { key: "sample-rule-A14", label: "Visit completed: note and codes needed (provider)" },
  { key: "sample-rule-A15", label: "Note waiting over 24 hours (provider)" },
  { key: "sample-rule-A19", label: "Submitted claim with no payer response for 2 days (biller)" },
  { key: "sample-rule-A26", label: "Appeal deadline within 14 days (manager)" },
];
