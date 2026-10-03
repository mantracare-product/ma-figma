import React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  MoreVertical,
} from "lucide-react";
import { Button } from "../ui/Button";
export interface Appointment {
  id: number;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  employeeId: number | string;
  serviceId: number | string;
  date: string;
  time: string;
  duration: number;
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "pending-accept";
  notes?: string;
  rating?: number;
  title?: string;
  description?: string;
  tags?: string[];
  processId?: string;
  stageId?: string;
}

export interface Employee {
  id: number | string;
  name: string;
  email?: string;
}

export interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

export interface AppointmentCalendarViewProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  selectedCalendarDate: Date;
  setSelectedCalendarDate: (date: Date) => void;
  appointments: Appointment[];
  getAppointmentsForDate: (dateStr: string) => Appointment[];
  employees: Employee[];
  services: Service[];
  openBookingDrawerForReschedule: (apt: Appointment) => void;
  onBookForDate: (dateStr: string) => void;
  formatDate: (date: Date) => string;
}

export default function AppointmentCalendarView({
  currentDate,
  setCurrentDate,
  selectedCalendarDate,
  setSelectedCalendarDate,
  appointments,
  getAppointmentsForDate,
  employees,
  services,
  openBookingDrawerForReschedule,
  onBookForDate,
  formatDate,
}: AppointmentCalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    return {
      daysInMonth: lastDay.getDate(),
      startingDayOfWeek: firstDay.getDay(),
    };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const selectedDateAppointments = getAppointmentsForDate(formatDate(selectedCalendarDate));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Minimalistic Calendar Grid (8 cols on lg) */}
      <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col">
        {/* Header: Month & Year + Navigation */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl sm:text-2xl font-bold text-slate-900"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            {monthNames[month]} {year}
          </h2>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("prev")}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setCurrentDate(today);
                setSelectedCalendarDate(today);
              }}
              className="h-8 px-3 text-xs font-semibold rounded-lg"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth("next")}
              className="h-8 w-8 p-0 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
            <div
              key={day}
              className="text-center text-[11px] font-semibold text-slate-400 tracking-wider uppercase py-1"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-2 flex-1">
          {/* Empty cells before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[105px] rounded-2xl bg-slate-50/40 border border-dashed border-slate-200/50"
            />
          ))}

          {/* Days of Month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateObj = new Date(year, month, day);
            const dateStr = formatDate(dateObj);
            const dayAppointments = getAppointmentsForDate(dateStr);
            const isToday = dateStr === formatDate(new Date());
            const isSelected = dateStr === formatDate(selectedCalendarDate);

            return (
              <div
                key={day}
                onClick={() => setSelectedCalendarDate(dateObj)}
                className={`min-h-[105px] rounded-2xl p-2.5 flex flex-col justify-between transition-all cursor-pointer border ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 shadow-xs"
                    : isToday
                    ? "border-blue-200 bg-blue-50/30 hover:border-blue-300"
                    : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                {/* Top Row: Date Number */}
                <div className="flex items-center justify-end">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-[#181e25] text-white shadow-xs"
                        : isToday
                        ? "bg-[#1456f0] text-white shadow-xs"
                        : "text-slate-700"
                    }`}
                    style={{ fontFamily: "Outfit, sans-serif" }}
                  >
                    {day}
                  </span>
                </div>

                {/* Appointment Tags */}
                <div className="space-y-1 my-auto">
                  {dayAppointments.slice(0, 3).map((apt, aptIdx) => {
                    const dotColor =
                      aptIdx % 4 === 0
                        ? "bg-blue-500"
                        : aptIdx % 4 === 1
                        ? "bg-emerald-500"
                        : aptIdx % 4 === 2
                        ? "bg-purple-500"
                        : "bg-amber-500";

                    return (
                      <div
                        key={apt.id}
                        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-700 truncate hover:bg-slate-100"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                        title={`${apt.time} - ${apt.title || apt.clientName}`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                        <span className="truncate">{apt.title || apt.clientName}</span>
                      </div>
                    );
                  })}

                  {dayAppointments.length > 3 && (
                    <div
                      className="text-[10px] font-semibold text-blue-600 pl-1"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Scheduled Side Panel (4 cols on lg) */}
      <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col min-h-[500px]">
        {/* Scheduled Header */}
        <div className="pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3
              className="text-base font-bold text-slate-900"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Scheduled
            </h3>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1456f0] border border-blue-200/60"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              {selectedDateAppointments.length} appointments
            </span>
          </div>
          <p
            className="text-xs text-slate-500 font-medium mt-1"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            {selectedCalendarDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Scheduled Appointments List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 max-h-[620px] pr-1">
          {selectedDateAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <CalendarIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800" style={{ fontFamily: "DM Sans, sans-serif" }}>
                No appointments scheduled
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]" style={{ fontFamily: "Outfit, sans-serif" }}>
                There are no sessions booked for this date.
              </p>
              <button
                type="button"
                onClick={() => onBookForDate(formatDate(selectedCalendarDate))}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1456f0] text-xs font-semibold transition-colors cursor-pointer"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Book for this day
              </button>
            </div>
          ) : (
            selectedDateAppointments.map((apt) => {
              const employee = employees.find((e) => String(e.id) === String(apt.employeeId));
              const service = services.find((s) => s.id === apt.serviceId);

              const [hours, minutes] = (apt.time || "09:00").split(":").map(Number);
              const endHour = hours + Math.floor((minutes + (apt.duration || 30)) / 60);
              const endMinute = (minutes + (apt.duration || 30)) % 60;
              const formatTime12 = (h: number, m: number) => {
                const period = h >= 12 ? "PM" : "AM";
                const h12 = h % 12 || 12;
                return `${h12}:${String(m).padStart(2, "0")} ${period}`;
              };
              const timeRangeStr = `${formatTime12(hours, minutes)} - ${formatTime12(endHour, endMinute)}`;

              return (
                <div
                  key={apt.id}
                  onClick={() => openBookingDrawerForReschedule(apt)}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
                >
                  {/* Top row: Title + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      {apt.title || service?.name || `Appointment with ${apt.clientName}`}
                    </h4>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                        style={{ fontFamily: "Outfit, sans-serif" }}
                      >
                        ✓ CONFIRMED
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-2.5 space-y-1.5">
                    {/* Time */}
                    <div
                      className="flex items-center gap-2 text-xs text-slate-500 font-medium"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {selectedCalendarDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {timeRangeStr}
                      </span>
                    </div>

                    {/* Client */}
                    <div
                      className="flex items-center gap-2 text-xs text-slate-700 font-medium"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        For: <strong className="text-slate-900">{apt.clientName}</strong>
                      </span>
                    </div>

                    {/* Provider */}
                    <div
                      className="flex items-center gap-2 text-xs text-slate-500 font-medium"
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        With: {employee?.name || "Assigned Provider"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
