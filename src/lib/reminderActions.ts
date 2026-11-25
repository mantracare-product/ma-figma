import {
  ReminderActivityEntry,
  ReminderAssignee,
  ReminderComment,
  appendActivity,
  updateActivity,
  isReminderEntry,
} from "./activityEngine";
import { addNotification } from "./notificationsStore";
import { TeamMember } from "./teamStore";

export interface ActorInfo {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
}

export function formatReminderDateDisplay(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return "";
  const parsed = new Date(`${dateStr}T${timeStr || "00:00"}`);
  if (isNaN(parsed.getTime())) {
    return timeStr ? `${dateStr} · ${timeStr}` : dateStr;
  }
  const datePart = parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!timeStr) return datePart;
  const timePart = parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${datePart} at ${timePart}`;
}

export function isReminderOverdue(dateStr?: string, timeStr?: string, status?: string): boolean {
  if (!dateStr || status === "completed") return false;
  const target = new Date(`${dateStr}T${timeStr || "23:59:59"}`);
  if (isNaN(target.getTime())) return false;
  return Date.now() > target.getTime();
}

export function extractMentionedMembers(
  text: string,
  teamMembers: TeamMember[],
  explicitAssignees: ReminderAssignee[] = []
): ReminderAssignee[] {
  const result = new Map<string, ReminderAssignee>();
  const lowerText = text.toLowerCase();

  const addAssignee = (m: ReminderAssignee) => {
    const key = String(m.id || m.email || m.name).toLowerCase();
    if (!result.has(key)) {
      result.set(key, m);
    }
  };

  for (const a of explicitAssignees) {
    if (a.name && lowerText.includes(`@${a.name.toLowerCase()}`)) {
      addAssignee(a);
    }
  }

  for (const m of teamMembers) {
    if (!m.name) continue;
    if (lowerText.includes(`@${m.name.toLowerCase()}`)) {
      addAssignee({
        id: String(m.id),
        name: m.name,
        email: m.email,
        role: m.role,
      });
    }
  }

  return Array.from(result.values());
}

export function createReminderActivity(params: {
  clientId: string;
  clientName?: string;
  processId?: string;
  processName?: string;
  note: string;
  date: string;
  time?: string;
  assignedMembers: ReminderAssignee[];
  actor?: ActorInfo | null;
}): ReminderActivityEntry | null {
  if (!params.clientId) return null;
  const nowIso = new Date().toISOString();
  const creatorName = params.actor?.name || "Admin User";
  const creatorId = params.actor?.id ? String(params.actor.id) : "1";

  const assignees: ReminderAssignee[] =
    params.assignedMembers.length > 0
      ? params.assignedMembers
      : [
          {
            id: creatorId,
            name: creatorName,
            email: params.actor?.email,
            role: params.actor?.role,
          },
        ];

  const dateDisplay = formatReminderDateDisplay(params.date, params.time);
  const assigneeNames = assignees.map((m) => `@${m.name}`).join(", ");

  const created = appendActivity({
    type: "reminder",
    clientId: params.clientId,
    clientName: params.clientName,
    processId: params.processId,
    processName: params.processName,
    status: "pending",
    reminderNote: params.note.trim(),
    reminderDate: params.date,
    reminderTime: params.time || undefined,
    createdBy: "user",
    createdById: creatorId,
    createdByName: creatorName,
    assignedMembers: assignees,
    comments: [],
    timestamp: nowIso,
    updatedAt: nowIso,
    details: {
      primary: params.note.trim(),
      secondary: `Due ${dateDisplay} · For ${assigneeNames}`,
    },
  });

  // Notify each assigned team member (even if same org/tab, so it appears in Notifications)
  assignees.forEach((member) => {
    const isSelf =
      (creatorId && String(member.id) === creatorId) ||
      (creatorName && member.name.toLowerCase() === creatorName.toLowerCase());
    if (isSelf && assignees.length > 1) return;

    addNotification({
      type: "reminder",
      title: `Reminder for @${member.name}`,
      message: `${creatorName} set a reminder for ${dateDisplay}${params.clientName ? ` (${params.clientName})` : ""}: "${params.note.trim()}"`,
      link: `/clients/${params.clientId}`,
      module: "clients",
      meta: {
        clientId: params.clientId,
        reminderId: created.id,
        targetUserId: String(member.id),
        targetUserName: member.name,
        createdByName: creatorName,
        dueDate: params.date,
        module: "clients",
      },
    });
  });

  return isReminderEntry(created) ? created : (created as unknown as ReminderActivityEntry);
}

export function toggleReminderDone(
  reminderId: string,
  actor?: ActorInfo | null
): ReminderActivityEntry | null {
  const actorName = actor?.name || "Team Member";
  const actorId = actor?.id ? String(actor.id) : undefined;
  const nowIso = new Date().toISOString();

  const updated = updateActivity(reminderId, (entry) => {
    if (!isReminderEntry(entry)) return entry;
    const nextCompleted = entry.status !== "completed";
    return {
      ...entry,
      status: nextCompleted ? "completed" : "pending",
      completedById: nextCompleted ? actorId : undefined,
      completedByName: nextCompleted ? actorName : undefined,
      completedAt: nextCompleted ? nowIso : undefined,
      updatedAt: nowIso,
    };
  });

  if (updated && isReminderEntry(updated)) {
    if (updated.status === "completed") {
      addNotification({
        type: "reminder",
        title: "Reminder Marked Done",
        message: `${actorName} completed the reminder${updated.clientName ? ` for ${updated.clientName}` : ""}: "${updated.reminderNote}"`,
        link: updated.clientId ? `/clients/${updated.clientId}` : undefined,
        module: "clients",
        meta: {
          clientId: updated.clientId,
          reminderId: updated.id,
          senderName: actorName,
          module: "clients",
        },
      });
    }
    return updated;
  }
  return null;
}

export function addReminderComment(
  reminderId: string,
  text: string,
  actor?: ActorInfo | null,
  mentions: ReminderAssignee[] = []
): ReminderActivityEntry | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const actorName = actor?.name || "Team Member";
  const actorId = actor?.id ? String(actor.id) : undefined;
  const nowIso = new Date().toISOString();

  const newComment: ReminderComment = {
    id: `rem-cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    authorId: actorId,
    authorName: actorName,
    authorRole: actor?.role,
    text: trimmed,
    mentions: mentions.length > 0 ? mentions : undefined,
    createdAt: nowIso,
  };

  const updated = updateActivity(reminderId, (entry) => {
    if (!isReminderEntry(entry)) return entry;
    return {
      ...entry,
      comments: [...(entry.comments || []), newComment],
      updatedAt: nowIso,
    };
  });

  if (updated && isReminderEntry(updated)) {
    addNotification({
      type: "reminder",
      title: `New Comment on Reminder`,
      message: `${actorName} commented${updated.clientName ? ` on ${updated.clientName}'s reminder` : ""}: "${trimmed}"`,
      link: updated.clientId ? `/clients/${updated.clientId}` : undefined,
      module: "clients",
      meta: {
        clientId: updated.clientId,
        reminderId: updated.id,
        senderName: actorName,
        module: "clients",
      },
    });
    return updated;
  }
  return null;
}
