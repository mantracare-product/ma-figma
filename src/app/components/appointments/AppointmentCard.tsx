import { useState } from "react";
import { Calendar, Clock, Check, X, Video, MessageCircle, Star, User, MoreVertical, CalendarIcon, XCircle, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Appointment {
  id: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  employeeId: number;
  serviceId: number;
  date: string;
  time: string;
  duration: number;
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "pending-accept";
  notes?: string;
  rating?: number;
}

interface Employee {
  id: number;
  name: string;
  email: string;
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

interface AppointmentCardProps {
  appointment: Appointment;
  employee?: Employee;
  service?: Service;
  onAccept?: (id: number) => void;
  onCancel?: (id: number) => void;
  onReschedule?: (id: number) => void;
  onMarkComplete?: (id: number) => void;
  onMarkNoShow?: (id: number) => void;
}

export default function AppointmentCard({
  appointment,
  employee,
  service,
  onAccept,
  onCancel,
  onReschedule,
  onMarkComplete,
  onMarkNoShow,
}: AppointmentCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (date: string, time: string) => {
    const d = new Date(date + "T" + time);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " at " + time;
  };

  const renderStars = (rating?: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className="w-4 h-4"
          style={{
            color: i <= (rating || 0) ? "#F59E0B" : "#D1D5DB",
            fill: i <= (rating || 0) ? "#F59E0B" : "#D1D5DB",
          }}
        />
      );
    }
    return stars;
  };

  const getStatusDot = () => {
    if (appointment.status === "completed") {
      return (
        <div
          className="flex items-center justify-center"
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: "#22C55E",
          }}
        >
          <Check className="w-3 h-3" style={{ color: "#FFFFFF" }} />
        </div>
      );
    }
    return (
      <div
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          backgroundColor: "#1A73E8",
        }}
      />
    );
  };

  const handleMenuAction = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case "reschedule":
        onReschedule?.(appointment.id);
        break;
      case "accept":
        onAccept?.(appointment.id);
        break;
      case "complete":
        onMarkComplete?.(appointment.id);
        break;
      case "noshow":
        onMarkNoShow?.(appointment.id);
        break;
      case "cancel":
        onCancel?.(appointment.id);
        break;
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        position: "relative",
      }}
    >
      {/* Row 1 - Client Info & Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          {/* Avatar with Badge */}
          <div className="relative">
            <div
              className="flex items-center justify-center"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#E5E7EB",
              }}
            >
              <User className="w-6 h-6" style={{ color: "#9CA3AF" }} />
            </div>
            {/* Video/Chat Badge */}
            <div
              className="absolute flex items-center justify-center"
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: "#1A73E8",
                bottom: "0",
                left: "0",
              }}
            >
              <Video className="w-2.5 h-2.5" style={{ color: "#FFFFFF" }} />
            </div>
          </div>

          {/* Client Name, Provider Name, Service */}
          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: "bold",
                color: "#111827",
                fontFamily: "DM Sans, sans-serif",
                marginBottom: "2px",
              }}
            >
              {appointment.clientName}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#6B7280",
                fontFamily: "Outfit, sans-serif",
                marginBottom: "2px",
              }}
            >
              {employee?.name || "Unknown Provider"}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#1A73E8",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {service?.name || "Unknown Service"}
            </div>
          </div>
        </div>

        {/* Status Dot & Three-Dot Menu */}
        <div className="flex items-center gap-2">
          {getStatusDot()}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="hover:bg-gray-100 rounded transition-colors"
            style={{
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            <MoreVertical className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
            }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "48px",
              right: "16px",
              width: "160px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
              zIndex: 50,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => handleMenuAction("reschedule")}
              className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
              style={{
                height: "36px",
                padding: "0 12px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
            >
              <CalendarIcon className="w-4 h-4" style={{ color: "#1A73E8" }} />
              <span style={{ fontSize: "13px", color: "#374151", fontFamily: "Outfit, sans-serif" }}>
                Reschedule
              </span>
            </button>

            <button
              onClick={() => handleMenuAction(appointment.status === "pending-accept" ? "accept" : "complete")}
              className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
              style={{
                height: "36px",
                padding: "0 12px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
            >
              <Check className="w-4 h-4" style={{ color: "#22C55E" }} />
              <span style={{ fontSize: "13px", color: "#374151", fontFamily: "Outfit, sans-serif" }}>
                {appointment.status === "pending-accept" ? "Accept" : "Mark Complete"}
              </span>
            </button>

            <button
              onClick={() => handleMenuAction("noshow")}
              className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
              style={{
                height: "36px",
                padding: "0 12px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
            >
              <XCircle className="w-4 h-4" style={{ color: "#F97316" }} />
              <span style={{ fontSize: "13px", color: "#374151", fontFamily: "Outfit, sans-serif" }}>
                No Show
              </span>
            </button>

            <button
              onClick={() => handleMenuAction("cancel")}
              className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
              style={{
                height: "36px",
                padding: "0 12px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
            >
              <Trash2 className="w-4 h-4" style={{ color: "#EF4444" }} />
              <span style={{ fontSize: "13px", color: "#374151", fontFamily: "Outfit, sans-serif" }}>
                Cancel
              </span>
            </button>
          </div>
        </>
      )}

      {/* Row 2 - Date & Duration */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
          <span
            style={{
              fontSize: "12px",
              color: "#6B7280",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            {formatDate(appointment.date, appointment.time)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" style={{ color: "#6B7280" }} />
          <span
            style={{
              fontSize: "12px",
              color: "#6B7280",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            {appointment.duration} min
          </span>
        </div>
      </div>

      {/* Row 3 - Star Rating (completed only) */}
      {appointment.status === "completed" && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">{renderStars(appointment.rating)}</div>
          <span
            style={{
              fontSize: "12px",
              color: "#6B7280",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Session rated
          </span>
        </div>
      )}

      {/* Pending Accept Note */}
      {appointment.status === "pending-accept" && (
        <div
          style={{
            fontSize: "11px",
            color: "#9CA3AF",
            fontStyle: "italic",
            fontFamily: "Outfit, sans-serif",
            marginTop: "8px",
          }}
        >
          *Provider requested appointment accept to confirm
        </div>
      )}
    </div>
  );
}
