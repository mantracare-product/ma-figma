import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { TeamMemberDrawer } from "../components/TeamMemberDrawer";

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

  return (
    <TeamMemberDrawer
      isOpen={isDrawerOpen}
      onClose={handleClose}
      member={{
        name: "Admin User",
        email: "admin@healthcare.com",
        phone: "+1 (555) 123-4567",
        role: "Admin",
      }}
    />
  );
}
