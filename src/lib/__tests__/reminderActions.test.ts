import { describe, it, expect, beforeEach } from "vitest";
import {
  createReminderActivity,
  toggleReminderDone,
  addReminderComment,
  extractMentionedMembers,
} from "../reminderActions";
import {
  getActivity,
  getAllReminders,
  isReminderForMember,
} from "../activityEngine";
import { INITIAL_TEAM_MEMBERS } from "../teamStore";

// Minimal browser storage shim for Node test environment
const memoryStore = new Map<string, string>();
const storageMock = {
  getItem: (k: string) => memoryStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memoryStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    memoryStore.delete(k);
  },
  clear: () => {
    memoryStore.clear();
  },
};

if (typeof globalThis.window === "undefined") {
  (globalThis as any).window = {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { href: "/" },
  };
}
(globalThis as any).localStorage = storageMock;
(globalThis as any).sessionStorage = storageMock;
if (typeof (globalThis as any).CustomEvent === "undefined") {
  (globalThis as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, init?: any) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
}
if (typeof (globalThis as any).Event === "undefined") {
  (globalThis as any).Event = class Event {
    type: string;
    constructor(type: string) {
      this.type = type;
    }
  };
}

describe("Reminder actions & activityEngine integration", () => {
  beforeEach(() => {
    memoryStore.clear();
  });

  it("extracts @mentioned team members from note text", () => {
    const mentioned = extractMentionedMembers(
      "Follow up with @Akshita Sharma and @Alice regarding lab results",
      INITIAL_TEAM_MEMBERS
    );
    expect(mentioned.map((m) => m.name)).toEqual(["Akshita Sharma", "Alice"]);
  });

  it("creates a reminder visible to assigned team members and supports mark done and comments", () => {
    const admin = INITIAL_TEAM_MEMBERS[0];
    const akshita = INITIAL_TEAM_MEMBERS[1];

    const created = createReminderActivity({
      clientId: "CL-101",
      clientName: "Navodya Jain",
      note: "@Akshita Sharma please review intake labs",
      date: "2026-11-30",
      time: "10:30",
      assignedMembers: [
        { id: String(akshita.id), name: akshita.name, email: akshita.email, role: akshita.role },
      ],
      actor: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });

    expect(created).not.toBeNull();
    expect(created!.status).toBe("pending");
    expect(isReminderForMember(created!, akshita)).toBe(true);
    expect(isReminderForMember(created!, INITIAL_TEAM_MEMBERS[2])).toBe(false);

    // Appears in client activity and global reminders
    const clientEntries = getActivity("CL-101");
    expect(clientEntries.some((e) => e.id === created!.id)).toBe(true);
    expect(getAllReminders().some((r) => r.id === created!.id)).toBe(true);

    // Other team member adds a comment
    const commented = addReminderComment(
      created!.id,
      "Reviewed labs, waiting on patient callback",
      { id: akshita.id, name: akshita.name, email: akshita.email, role: akshita.role }
    );
    expect(commented).not.toBeNull();
    expect(commented!.comments).toHaveLength(1);
    expect(commented!.comments![0].authorName).toBe("Akshita Sharma");
    expect(commented!.comments![0].text).toBe("Reviewed labs, waiting on patient callback");

    // Other team member marks reminder as done
    const completed = toggleReminderDone(created!.id, {
      id: akshita.id,
      name: akshita.name,
      email: akshita.email,
      role: akshita.role,
    });
    expect(completed).not.toBeNull();
    expect(completed!.status).toBe("completed");
    expect(completed!.completedByName).toBe("Akshita Sharma");

    // Persisted in activityEngine
    const refreshed = getAllReminders().find((r) => r.id === created!.id);
    expect(refreshed?.status).toBe("completed");
    expect(refreshed?.comments).toHaveLength(1);
  });
});
