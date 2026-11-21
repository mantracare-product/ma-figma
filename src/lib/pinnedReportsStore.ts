export const PINNED_REPORTS_STORAGE_KEY = "ma_overview_pinned_report_ids_v1";
export const PINNED_REPORTS_EVENT = "ma_overview_pinned_reports_changed";

/**
 * Returns the list of report IDs currently pinned to the Overview dashboard.
 */
export function getPinnedReportIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINNED_REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to read pinned reports from localStorage:", err);
    return [];
  }
}

/**
 * Checks if a specific report is pinned to the Overview.
 */
export function isReportPinned(reportId: string): boolean {
  if (!reportId) return false;
  return getPinnedReportIds().includes(reportId);
}

/**
 * Sets the pinned state for a given report ID and notifies listeners.
 */
export function setReportPinned(reportId: string, pinned: boolean): boolean {
  if (!reportId || typeof window === "undefined") return false;
  try {
    const current = getPinnedReportIds();
    let updated: string[];
    if (pinned) {
      if (!current.includes(reportId)) {
        updated = [...current, reportId];
      } else {
        updated = current;
      }
    } else {
      updated = current.filter((id) => id !== reportId);
    }
    localStorage.setItem(PINNED_REPORTS_STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom event for real-time reactivity across active tabs and components
    window.dispatchEvent(
      new CustomEvent(PINNED_REPORTS_EVENT, {
        detail: { reportId, pinned, allPinned: updated },
      })
    );
    return pinned;
  } catch (err) {
    console.error("Failed to update pinned reports in localStorage:", err);
    return false;
  }
}

/**
 * Toggles the pinned state for a given report ID.
 * Returns true if now pinned, false if unpinned.
 */
export function togglePinReport(reportId: string): boolean {
  const currentlyPinned = isReportPinned(reportId);
  return setReportPinned(reportId, !currentlyPinned);
}

/**
 * Unpins a report from the Overview dashboard.
 */
export function unpinReport(reportId: string): void {
  setReportPinned(reportId, false);
}
