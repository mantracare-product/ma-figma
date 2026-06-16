import { X, ChevronDown } from "lucide-react";

interface Employee {
  id: number;
  name: string;
  email: string;
}

interface AppointmentFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterDate: string;
  setFilterDate: (value: string) => void;
  filterProvider: number | "all";
  setFilterProvider: (value: number | "all") => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  employees: Employee[];
  onApply: () => void;
}

export default function AppointmentFilterModal({
  isOpen,
  onClose,
  filterDate,
  setFilterDate,
  filterProvider,
  setFilterProvider,
  filterStatus,
  setFilterStatus,
  employees,
  onApply,
}: AppointmentFilterModalProps) {
  if (!isOpen) return null;

  const handleApply = () => {
    onApply();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-white relative"
        style={{
          width: "480px",
          borderRadius: "12px",
          padding: "24px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            style={{
              fontSize: "18px",
              fontWeight: "bold",
              color: "#111827",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Filter Appointments
          </h2>
          <button
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
            style={{ color: "#6B7280" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Fields */}
        <div className="space-y-4">
          {/* Date Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#374151",
                marginBottom: "8px",
                fontFamily: "Outfit, sans-serif",
                fontWeight: 500,
              }}
            >
              Date
            </label>
            <div className="relative">
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{
                  width: "100%",
                  height: "48px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "0 40px 0 16px",
                  fontSize: "14px",
                  color: "#374151",
                  fontFamily: "Outfit, sans-serif",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="Today">Today</option>
                <option value="Week">Week</option>
                <option value="Month">Month</option>
                <option value="Custom Range">Custom Range</option>
              </select>
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "#1A73E8", width: "20px", height: "20px" }}
              />
            </div>
          </div>

          {/* Provider Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#374151",
                marginBottom: "8px",
                fontFamily: "Outfit, sans-serif",
                fontWeight: 500,
              }}
            >
              Provider Name
            </label>
            <div className="relative">
              <select
                value={filterProvider}
                onChange={(e) =>
                  setFilterProvider(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                style={{
                  width: "100%",
                  height: "48px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "0 40px 0 16px",
                  fontSize: "14px",
                  color: "#374151",
                  fontFamily: "Outfit, sans-serif",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Providers</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "#1A73E8", width: "20px", height: "20px" }}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                color: "#374151",
                marginBottom: "8px",
                fontFamily: "Outfit, sans-serif",
                fontWeight: 500,
              }}
            >
              Session Status
            </label>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  height: "48px",
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "0 40px 0 16px",
                  fontSize: "14px",
                  color: "#374151",
                  fontFamily: "Outfit, sans-serif",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="All">All</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <ChevronDown
                className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "#1A73E8", width: "20px", height: "20px" }}
              />
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleApply}
          style={{
            width: "100%",
            height: "48px",
            background: "linear-gradient(90deg, #06B6D4 0%, #1A73E8 100%)",
            color: "#FFFFFF",
            fontSize: "15px",
            fontWeight: "bold",
            fontFamily: "Outfit, sans-serif",
            borderRadius: "8px",
            border: "none",
            marginTop: "24px",
            cursor: "pointer",
          }}
          className="hover:opacity-90 transition-opacity"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
