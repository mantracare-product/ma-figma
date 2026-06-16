import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import ProfileDrawer from "../components/profile/ProfileDrawer";

export default function Profile() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Open the drawer when the component mounts
    setIsDrawerOpen(true);
  }, []);

  const handleClose = () => {
    setIsDrawerOpen(false);
    // Navigate back to the previous page or home
    navigate(-1);
  };

  return (
    <ProfileDrawer
      isOpen={isDrawerOpen}
      onClose={handleClose}
    />
  );
}
