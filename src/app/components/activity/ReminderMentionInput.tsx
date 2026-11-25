import React, { useState, useRef, useEffect, useMemo } from "react";
import { AtSign, X } from "lucide-react";
import { TeamMember } from "../../../lib/teamStore";
import { ReminderAssignee } from "../../../lib/activityEngine";

interface MentionTrigger {
  startIndex: number;
  endIndex: number;
  query: string;
}

function detectMentionTrigger(
  text: string,
  cursorPos: number,
  teamMembers: TeamMember[]
): MentionTrigger | null {
  const beforeCursor = text.slice(0, cursorPos);
  const lastAt = beforeCursor.lastIndexOf("@");
  if (lastAt === -1) return null;

  // Must be at start of text or preceded by whitespace / punctuation
  if (lastAt > 0 && !/[\s(,[{]/.test(beforeCursor[lastAt - 1])) {
    return null;
  }

  const afterAt = beforeCursor.slice(lastAt + 1);
  if (afterAt.includes("\n")) return null;

  // If no space yet, keep dropdown open for any query up to 30 chars
  if (!afterAt.includes(" ")) {
    if (afterAt.length > 30) return null;
    return { startIndex: lastAt, endIndex: cursorPos, query: afterAt };
  }

  // If there is a space (e.g. "@Akshita S"), only keep open while it's a prefix
  // of a team member's name (and not already followed by extra prose after a trailing space)
  const qLower = afterAt.toLowerCase();
  const stillMatchingName = teamMembers.some((m) =>
    (m.name || "").toLowerCase().startsWith(qLower)
  );
  if (!stillMatchingName) return null;

  return { startIndex: lastAt, endIndex: cursorPos, query: afterAt };
}

export function getMemberInitials(name: string): string {
  return (name || "TM")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function renderTextWithMentions(
  text: string,
  knownAssignees: ReminderAssignee[] = [],
  teamMembers: TeamMember[] = []
): React.ReactNode {
  if (!text) return null;

  const candidateNames = Array.from(
    new Set(
      [
        ...knownAssignees.map((a) => a.name),
        ...teamMembers.map((m) => m.name),
      ]
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
    )
  );

  if (candidateNames.length === 0) return text;

  const escaped = candidateNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(@(?:${escaped.join("|")}))(?=$|\\s|[.,!?;:])`, "gi");

  const parts = text.split(regex);
  return parts.map((part, idx) => {
    if (part.startsWith("@") && candidateNames.some((n) => `@${n}`.toLowerCase() === part.toLowerCase())) {
      return (
        <span key={idx} className="text-blue-600 font-semibold">
          {part}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export interface ReminderMentionInputProps {
  value: string;
  onChange: (value: string) => void;
  teamMembers: TeamMember[];
  currentUserId?: string;
  currentUserName?: string;
  onSelectMember: (member: ReminderAssignee) => void;
  assignedMembers?: ReminderAssignee[];
  onRemoveMember?: (member: ReminderAssignee) => void;
  showInsideMentionButton?: boolean;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
  onSubmit?: () => void;
  className?: string;
  dropdownDirection?: "down" | "up";
}

export default function ReminderMentionInput({
  value,
  onChange,
  teamMembers,
  currentUserId,
  currentUserName,
  onSelectMember,
  assignedMembers = [],
  onRemoveMember,
  showInsideMentionButton = false,
  placeholder = "Add reminder notes...",
  rows = 3,
  multiline = true,
  onSubmit,
  className = "",
  dropdownDirection = "down",
}: ReminderMentionInputProps) {
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [trigger, setTrigger] = useState<MentionTrigger | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredMembers = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.trim().toLowerCase();
    const activeMembers = teamMembers.filter((m) => m.status !== false);
    if (!q) return activeMembers;
    return activeMembers.filter((m) => {
      const name = (m.name || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      const role = (m.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [trigger, teamMembers]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trigger?.query, filteredMembers.length]);

  useEffect(() => {
    if (!trigger) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTrigger(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [trigger]);

  const evaluateTrigger = (nextValue: string, cursor: number | null) => {
    const pos = cursor ?? nextValue.length;
    setTrigger(detectMentionTrigger(nextValue, pos, teamMembers));
  };

  const insertMention = (member: TeamMember) => {
    if (!trigger) return;
    const before = value.slice(0, trigger.startIndex);
    const after = value.slice(trigger.endIndex);
    const insertion = `@${member.name} `;
    const nextValue = `${before}${insertion}${after.startsWith(" ") ? after.slice(1) : after}`;
    onChange(nextValue);
    onSelectMember({
      id: String(member.id),
      name: member.name,
      email: member.email,
      role: member.role,
    });
    setTrigger(null);

    const nextCursor = before.length + insertion.length;
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (trigger) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filteredMembers.length > 0) {
          setActiveIndex((prev) => (prev + 1) % filteredMembers.length);
        }
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filteredMembers.length > 0) {
          setActiveIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        }
        return;
      }
      if ((e.key === "Enter" || e.key === "Tab") && filteredMembers.length > 0) {
        e.preventDefault();
        insertMention(filteredMembers[activeIndex] || filteredMembers[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTrigger(null);
        return;
      }
    } else if (!multiline && e.key === "Enter" && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const nextVal = e.target.value;
    onChange(nextVal);
    evaluateTrigger(nextVal, e.target.selectionStart);
  };

  const handleInsideAtClick = () => {
    const el = inputRef.current;
    const cursorPos = el?.selectionStart ?? value.length;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const needsSpace = before.length > 0 && !/\s$/.test(before);
    const insertion = needsSpace ? " @" : "@";
    const nextValue = `${before}${insertion}${after}`;
    onChange(nextValue);

    const nextCursor = before.length + insertion.length;
    setTrigger({
      startIndex: nextCursor - 1,
      endIndex: nextCursor,
      query: "",
    });
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  const dropdownPositionClass =
    dropdownDirection === "up" ? "bottom-full mb-1.5" : "top-full mt-1.5";

  return (
    <div ref={containerRef} className="relative w-full">
      {multiline ? (
        showInsideMentionButton ? (
          <div className="w-full bg-white border border-gray-200 rounded-lg focus-within:ring-1 focus-within:ring-[#1F2937]/15 focus-within:border-[#1F2937] transition-all overflow-hidden">
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              rows={rows}
              placeholder={placeholder}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onClick={(e) => evaluateTrigger(value, (e.target as HTMLTextAreaElement).selectionStart)}
              className={`w-full text-xs p-2.5 pb-1.5 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-800 resize-none ${className}`}
              style={{ fontFamily: "Outfit, sans-serif" }}
            />
            <div className="px-2.5 pb-2 pt-1 flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsideAtClick();
                  }}
                  title="Tag team member (@)"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 border border-gray-200/80 hover:border-blue-200 transition-colors cursor-pointer"
                >
                  <AtSign className="w-3.5 h-3.5" />
                </button>
                {assignedMembers.map((m) => (
                  <span
                    key={String(m.id || m.name)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-semibold"
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    <span>@{m.name}</span>
                    {onRemoveMember && (
                      <button
                        type="button"
                        onClick={() => onRemoveMember(m)}
                        className="hover:text-blue-900 cursor-pointer"
                        aria-label={`Remove ${m.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={rows}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => evaluateTrigger(value, (e.target as HTMLTextAreaElement).selectionStart)}
            className={`w-full text-xs p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F2937]/15 focus:border-[#1F2937] transition-all text-gray-800 ${className}`}
            style={{ fontFamily: "Outfit, sans-serif" }}
          />
        )
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClick={(e) => evaluateTrigger(value, (e.target as HTMLInputElement).selectionStart)}
          className={`w-full text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F2937]/15 focus:border-[#1F2937] transition-all text-gray-800 ${className}`}
          style={{ fontFamily: "Outfit, sans-serif" }}
        />
      )}

      {trigger && (
        <div
          className={`absolute left-0 ${dropdownPositionClass} w-72 max-w-full bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-[120] overflow-hidden`}
          style={{ boxShadow: "0 12px 30px rgba(15, 23, 42, 0.14)" }}
        >
          <div className="px-3 py-1 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <AtSign className="w-3 h-3 text-blue-600" />
              Select Team Member
            </span>
            {trigger.query && (
              <span className="text-[10px] text-blue-600 font-medium truncate max-w-[110px]">
                @{trigger.query}
              </span>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {filteredMembers.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                No matching team member found
              </div>
            ) : (
              filteredMembers.map((member, idx) => {
                const isSelectedIdx = idx === activeIndex;
                const isYou =
                  (currentUserId && String(member.id) === String(currentUserId)) ||
                  (currentUserName && member.name?.toLowerCase() === currentUserName.toLowerCase());
                return (
                  <button
                    key={String(member.id)}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(member);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors cursor-pointer ${
                      isSelectedIdx ? "bg-blue-50/90" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-[#1F2937] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {getMemberInitials(member.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-semibold text-gray-900 truncate"
                          style={{ fontFamily: "DM Sans, sans-serif" }}
                        >
                          {member.name}
                        </span>
                        {isYou && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-500">
                            You
                          </span>
                        )}
                      </div>
                      <p
                        className="text-[11px] text-gray-500 truncate"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        {member.role || member.department || member.email}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
