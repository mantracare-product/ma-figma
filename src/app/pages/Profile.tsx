import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { TeamMemberDrawer } from "../components/TeamMemberDrawer";
import { getStoredTeamMembers, saveStoredTeamMembers } from "../../lib/teamStore";

export default function Profile() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsDrawerOpen(true);
  }, []);

  const handleClose = () => {
    setIsDrawerOpen(false);
    navigate(-1);
  };

  const members = getStoredTeamMembers();
  const currentAdmin =
    members.find((m) => (m.role || "").toLowerCase() === "admin") ||
    members[0] || {
      id: 1,
      name: "Admin User",
      email: "admin@mantra.care",
      phone: "+1 (555) 019-2834",
      role: "Admin",
      department: "Administration",
      canBookAppointments: true,
      calendarConnected: true,
      connectedCalendar: "google" as const,
      status: true,
    };

  return (
    <TeamMemberDrawer
      isOpen={isDrawerOpen}
      onClose={handleClose}
      member={{
        id: currentAdmin.id,
        name: currentAdmin.name,
        email: currentAdmin.email,
        phone: currentAdmin.phone || "+1 (555) 019-2834",
        role: currentAdmin.role || "Admin",
        department: currentAdmin.department || "Administration",
        canBookAppointments: currentAdmin.canBookAppointments ?? true,
        calendarConnected: currentAdmin.calendarConnected ?? true,
        connectedCalendar: currentAdmin.connectedCalendar || "google",
        status: currentAdmin.status ?? true,
        locations: currentAdmin.locations,
        assignedServices: currentAdmin.assignedServices,
        permissions: currentAdmin.permissions,
        customFields: (currentAdmin as any).customFields,
      }}
      onSave={(updated) => {
        if (updated) {
          const updatedList = members.map((m) =>
            String(m.id) === String(updated.id) ? { ...m, ...updated } : m
          );
          saveStoredTeamMembers(updatedList);
        }
      }}
    />
  );
}
