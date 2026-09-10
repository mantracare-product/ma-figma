import React, { useState, useRef, useEffect } from "react";
import { User, ChevronDown, Check, Plus, UserCheck, UserPlus, ArrowLeft, Search } from "lucide-react";
import { TeamMember, useTeamMembers } from "../../../lib/teamStore";
import AddTeamMemberDrawer from "../team/AddTeamMemberDrawer";
import { toast } from "sonner";

export interface TargetUserDropdownProps {
  selectedUserId: string | number;
  onSelectUser: (userId: string | number) => void;
  className?: string;
}

export default function TargetUserDropdown({
  selectedUserId,
  onSelectUser,
  className = "",
}: TargetUserDropdownProps) {
  const {
    bookableMembers,
    nonBookableMembers,
    enableBooking,
  } = useTeamMembers();

  const [isOpen, setIsOpen] = useState(false);
  // view: "list" | "choose-existing"
  const [dropdownView, setDropdownView] = useState<"list" | "choose-existing">("list");
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setDropdownView("list");
        setSearchQuery("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedUser =
    bookableMembers.find((u) => String(u.id) === String(selectedUserId)) ||
    bookableMembers[0];

  const handleSelect = (userId: string | number) => {
    onSelectUser(userId);
    setIsOpen(false);
    setDropdownView("list");
    setSearchQuery("");
  };

  const handleEnableExisting = (member: TeamMember) => {
    enableBooking(member.id);
    onSelectUser(member.id);
    toast.success(`${member.name} is now enabled for appointments`);
    setIsOpen(false);
    setDropdownView("list");
    setSearchQuery("");
  };

  const handleNewMemberCreated = (newMember: TeamMember) => {
    onSelectUser(newMember.id);
    setIsOpen(false);
    setDropdownView("list");
  };

  const filteredBookable = bookableMembers.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNonBookable = nonBookableMembers.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className={`relative ${className}`} ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setDropdownView("list");
            setSearchQuery("");
          }}
          className="w-full sm:w-auto min-w-[250px] max-w-[340px] flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 transition-all shadow-2xs cursor-pointer text-left"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <User className="w-3 h-3" />
            </div>
            <span className="truncate">
              {selectedUser ? `${selectedUser.name} (${selectedUser.email})` : "Select Team Member"}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute left-0 top-full mt-1.5 w-full sm:w-[320px] bg-white rounded-2xl border border-slate-200/90 shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {/* VIEW 1: Available Team Members List */}
            {dropdownView === "list" && (
              <>
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/50">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5">
                    Available Team Members
                  </div>
                  {bookableMembers.length > 5 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search team members..."
                        className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
                      />
                    </div>
                  )}
                </div>

                <div className="max-h-[220px] overflow-y-auto p-1.5 space-y-0.5">
                  {filteredBookable.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching team members
                    </div>
                  ) : (
                    filteredBookable.map((member) => {
                      const isSelected = String(member.id) === String(selectedUser?.id);
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleSelect(member.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/80 text-primary font-semibold"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold truncate text-slate-800">
                              {member.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {member.email}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Bottom Action: Add Available Team Member */}
                <div className="p-2 border-t border-slate-100 bg-[#fbfcfd] space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-0.5">
                    Need more providers?
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {/* Option 1: Choose from existing team members */}
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownView("choose-existing");
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-slate-800">
                          Choose from available team members
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          {nonBookableMembers.length} team members without booking enabled
                        </div>
                      </div>
                    </button>

                    {/* Option 2: Add new team member */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDrawer(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/5 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                        <UserPlus className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-primary">
                          Add new team member
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          Pre-configured for appointment booking
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* VIEW 2: Sub-dropdown of left available team members (who cannot book appointments yet) */}
            {dropdownView === "choose-existing" && (
              <>
                <div className="p-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownView("list");
                      setSearchQuery("");
                    }}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                    title="Back to available list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Enable Existing Member
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Select a team member to enable for booking
                    </div>
                  </div>
                </div>

                {nonBookableMembers.length > 4 && (
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search existing members..."
                        className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-primary text-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div className="max-h-[240px] overflow-y-auto p-1.5 space-y-1">
                  {nonBookableMembers.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs font-medium text-slate-600">
                        All team members are already enabled!
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Every member in your organization can currently book appointments.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddDrawer(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add New Member
                      </button>
                    </div>
                  ) : filteredNonBookable.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No matching team members found
                    </div>
                  ) : (
                    filteredNonBookable.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleEnableExisting(member)}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-left cursor-pointer border border-transparent hover:border-slate-200"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-slate-800 truncate">
                            {member.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {member.email}
                          </div>
                          {member.role && (
                            <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {member.role}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-primary px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 hover:bg-primary hover:text-white transition-colors">
                          Enable
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add New Team Member Drawer with appointment booking pre-checked */}
      <AddTeamMemberDrawer
        isOpen={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        initialCanBookAppointments={true}
        onSuccess={handleNewMemberCreated}
      />
    </>
  );
}
