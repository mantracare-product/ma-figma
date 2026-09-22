import React, { useState } from "react";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  User,
  ArrowRight,
  Video,
  MapPin,
  Building2,
  Mail,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { createNewAppointment, Appointment } from "../../../../lib/appointmentsStore";
import { toast } from "sonner";

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  onBookingComplete: (appt: Appointment) => void;
}

export type ConsultationType = "video" | "in-person";
export type ClinicLocationCode = "PV" | "NOIDA" | "BAHADURGARH";

interface DoctorOption {
  id: string;
  name: string;
  specialty: string;
  email: string;
  experience: string;
  rating: string;
  avatar: string;
  avatarBg: string;
}

const DOCTORS: DoctorOption[] = [
  {
    id: "dr-meera",
    name: "Dr. Meera Nair",
    specialty: "Senior Ophthalmologist · Cataract & Cornea",
    email: "meera.nair@mantra.care",
    experience: "14+ yrs",
    rating: "4.9 ★",
    avatar: "MN",
    avatarBg: "bg-blue-600",
  },
  {
    id: "dr-rohan",
    name: "Dr. Rohan Verma",
    specialty: "Senior Vitreo-Retinal Surgeon",
    email: "rohan.verma@mantra.care",
    experience: "12+ yrs",
    rating: "4.8 ★",
    avatar: "RV",
    avatarBg: "bg-emerald-600",
  },
  {
    id: "dr-ananya",
    name: "Dr. Ananya Sharma",
    specialty: "Glaucoma & Pediatric Ophthalmology",
    email: "ananya.sharma@mantra.care",
    experience: "10+ yrs",
    rating: "4.9 ★",
    avatar: "AS",
    avatarBg: "bg-indigo-600",
  },
];

interface ClinicLocation {
  code: ClinicLocationCode;
  shortName: string;
  fullName: string;
  address: string;
  operatingDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  slots: string[];
}

const LOCATIONS: ClinicLocation[] = [
  {
    code: "PV",
    shortName: "Paschim Vihar (PV)",
    fullName: "EyeMantra Hospital — Paschim Vihar",
    address: "A-1/10, Paschim Vihar, West Delhi",
    operatingDays: [1, 2, 3, 4, 5, 6],
    slots: ["09:30 AM", "10:30 AM", "11:45 AM", "02:00 PM", "03:30 PM", "05:00 PM"],
  },
  {
    code: "NOIDA",
    shortName: "Noida",
    fullName: "EyeMantra Super Speciality — Noida",
    address: "B-23, Sector 62, Noida, UP",
    operatingDays: [1, 2, 3, 4, 5, 6],
    slots: ["10:00 AM", "11:30 AM", "01:00 PM", "04:00 PM", "05:30 PM"],
  },
  {
    code: "BAHADURGARH",
    shortName: "Bahadurgarh",
    fullName: "EyeMantra Eye Center — Bahadurgarh",
    address: "Delhi-Rohtak Road, Bahadurgarh",
    operatingDays: [1, 2, 4, 5, 6],
    slots: ["02:00 PM", "03:15 PM", "04:30 PM", "05:45 PM"],
  },
];

const ONLINE_VIDEO_SLOTS = [
  "09:30 AM",
  "11:00 AM",
  "01:30 PM",
  "03:00 PM",
  "05:30 PM",
  "07:00 PM",
];

export default function BookAppointmentModal({
  isOpen,
  onClose,
  clientName,
  clientEmail,
  clientPhone,
  onBookingComplete,
}: BookAppointmentModalProps) {
  // Session type: default "video" or "in-person"
  const [sessionType, setSessionType] = useState<ConsultationType>("video");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(DOCTORS[0].id);
  const [selectedLocationCode, setSelectedLocationCode] = useState<ClinicLocationCode>("PV");

  // Date offset for carousel pagination
  const [dateOffset, setDateOffset] = useState<number>(0);

  // Generate 14 upcoming calendar days starting today
  const today = new Date();
  const allDays = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i);
    return {
      dateString: d.toISOString().split("T")[0],
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNumber: d.getDate(),
      monthName: d.toLocaleDateString("en-US", { month: "short" }),
      dayOfWeek: d.getDay(),
    };
  });

  // Display 7 days at a time
  const visibleDays = allDays.slice(dateOffset, dateOffset + 7);
  const [selectedDay, setSelectedDay] = useState(allDays[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>("10:30 AM");

  // Confirmation Success State
  const [confirmedAppt, setConfirmedAppt] = useState<Appointment | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDoctorDropdownOpen, setIsDoctorDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const selectedDoctor = DOCTORS.find((d) => d.id === selectedDoctorId) || DOCTORS[0];
  const selectedLocation = LOCATIONS.find((l) => l.code === selectedLocationCode) || LOCATIONS[0];

  // Location open check
  const isLocationOpenOnDate = selectedLocation.operatingDays.includes(selectedDay.dayOfWeek);

  // Available slots
  const availableSlots =
    sessionType === "video"
      ? ONLINE_VIDEO_SLOTS
      : isLocationOpenOnDate
      ? selectedLocation.slots
      : [];

  const handlePrevDays = () => {
    if (dateOffset > 0) {
      setDateOffset((prev) => Math.max(0, prev - 3));
    }
  };

  const handleNextDays = () => {
    if (dateOffset + 7 < allDays.length) {
      setDateOffset((prev) => Math.min(allDays.length - 7, prev + 3));
    }
  };

  const handleConfirmBooking = () => {
    // Generate unique video room link if online
    const generatedRoomId = `eye-${Math.random().toString(36).substring(2, 9)}`;
    const generatedVideoLink = `https://meet.mantra.care/room/${generatedRoomId}`;

    const effectiveLocation =
      sessionType === "video"
        ? "Online Video Consultation (HD Telehealth)"
        : selectedLocation.fullName;

    const newAppt = createNewAppointment({
      clientName: clientName || "abhishek testehr",
      clientEmail: clientEmail || "abhishek.madaan+testehr@mantra.care",
      clientPhone: clientPhone || "+91 7788994455",
      employeeId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      doctorEmail: selectedDoctor.email,
      serviceId: sessionType === "video" ? 2 : 1,
      serviceName: `${sessionType === "video" ? "Video Consultation" : "Clinic Visit"} with ${selectedDoctor.name}`,
      title: `${sessionType === "video" ? "Video Consultation" : "Clinic Visit"} with ${selectedDoctor.name}`,
      date: selectedDay.dateString,
      time: selectedSlot.replace(" AM", "").replace(" PM", ""),
      duration: sessionType === "video" ? 25 : 35,
      status: "scheduled",
      processId: "op-cataract",
      notes: `${sessionType === "video" ? "Online Telehealth Video Consult" : `In-Person Visit at ${selectedLocation.shortName}`}`,
      location: effectiveLocation,
      locationCode: sessionType === "in-person" ? selectedLocation.code : undefined,
      type: sessionType,
      meetingLink: sessionType === "video" ? generatedVideoLink : undefined,
    });

    if (sessionType === "video") {
      toast.success(`Video appointment confirmed! Meeting link sent to ${clientEmail || "your email"}`);
    } else {
      toast.success(`In-person visit confirmed at EyeMantra (${selectedLocation.shortName})!`);
    }

    setConfirmedAppt(newAppt);
    onBookingComplete(newAppt);
  };

  const handleCopyLink = () => {
    if (confirmedAppt?.meetingLink) {
      navigator.clipboard.writeText(confirmedAppt.meetingLink);
      setIsCopied(true);
      toast.success("Video link copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleModalClose = () => {
    setConfirmedAppt(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#151c24] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#151c24] shrink-0">
          <h2 className="font-semibold text-slate-900 dark:text-white text-base">
            {confirmedAppt ? "Appointment Confirmed" : "Schedule Appointment"}
          </h2>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Confirmation Screen */}
        {confirmedAppt ? (
          <div className="p-6 overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Booking Confirmed
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                  {confirmedAppt.serviceName || confirmedAppt.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {selectedDay.monthName} {selectedDay.dayNumber} at {confirmedAppt.time} · {confirmedAppt.doctorName}
                </p>
              </div>
            </div>

            {/* Video or In-Person Specific Card */}
            {confirmedAppt.type === "video" ? (
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1456f0] uppercase tracking-wider">
                    <Video className="w-4 h-4" />
                    <span>Online Video Consultation Link</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-[#1456f0] dark:text-blue-300">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
                    {confirmedAppt.meetingLink}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="cursor-pointer shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? "Copied" : "Copy"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Meeting invitation link has been automatically emailed to{" "}
                    <strong className="text-slate-900 dark:text-white">
                      {clientEmail || "abhishek.madaan+testehr@mantra.care"}
                    </strong>{" "}
                    and <strong className="text-slate-900 dark:text-white">{confirmedAppt.doctorEmail}</strong>.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-[#1456f0]" />
                  <span>Clinic Location &amp; Directions</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {selectedLocation.fullName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedLocation.address}
                </div>
                <div className="pt-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your Fast Check-In QR Pass is now available in your Visits tab.</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              {confirmedAppt.meetingLink && (
                <button
                  type="button"
                  onClick={() => window.open(confirmedAppt.meetingLink, "_blank")}
                  className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 text-[#1456f0] hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs font-semibold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Video Room</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleModalClose}
                className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#00a8ff] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all"
              >
                <span>Done &amp; View in Visits</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
              MAIN SCHEDULING FORM (Aligned with UI Reference)
              ========================================================================= */
          <div className="p-5 overflow-y-auto space-y-6">
            {/* Top Doctor Profile Card with Dropdown (Chevron on right matching user's arrow) */}
            <div className="relative pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDoctorDropdownOpen(!isDoctorDropdownOpen)}
                className="w-full flex items-center justify-between gap-3 p-2 -mx-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-full ${selectedDoctor.avatarBg} text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs`}
                  >
                    {selectedDoctor.avatar}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                      <span>{selectedDoctor.name}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedDoctor.specialty}
                    </p>
                  </div>
                </div>

                {/* Dropdown Chevron on the Right (Where user drew red arrow) */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors shrink-0">
                  <ChevronDown
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isDoctorDropdownOpen ? "rotate-180 text-[#00a8ff]" : ""
                    }`}
                  />
                </div>
              </button>

              {/* Floating Dropdown Menu (Directly below doctor card) */}
              {isDoctorDropdownOpen && (
                <>
                  {/* Click outside backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDoctorDropdownOpen(false)}
                  />

                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-[#151c24] rounded-2xl p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    {DOCTORS.map((doc) => {
                      const isSelected = selectedDoctorId === doc.id;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setSelectedDoctorId(doc.id);
                            setIsDoctorDropdownOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/80 dark:bg-blue-950/60 text-slate-900 dark:text-white"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-full ${doc.avatarBg} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                            >
                              {doc.avatar}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-900 dark:text-white">
                                {doc.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {doc.specialty}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-[#00a8ff] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Section: What days work best for you? */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                What days work best for you?
              </h3>

              <div className="flex items-center gap-1.5 justify-between">
                {/* Left arrow */}
                <button
                  type="button"
                  onClick={handlePrevDays}
                  disabled={dateOffset === 0}
                  className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    dateOffset === 0 ? "opacity-30 cursor-not-allowed" : "cursor-pointer text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Days Carousel */}
                <div className="grid grid-cols-7 gap-1.5 flex-1 text-center">
                  {visibleDays.map((day) => {
                    const isSelected = selectedDay.dateString === day.dateString;
                    return (
                      <button
                        key={day.dateString}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`py-2.5 px-1 rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? "bg-[#00a8ff] text-white shadow-sm font-semibold ring-2 ring-blue-400/20"
                            : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-medium opacity-80">
                          {day.dayName}
                        </span>
                        <span className="text-base font-bold my-0.5">
                          {day.dayNumber}
                        </span>
                        <span className="text-[10px] opacity-80 font-medium">
                          {day.monthName}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right arrow */}
                <button
                  type="button"
                  onClick={handleNextDays}
                  disabled={dateOffset + 7 >= allDays.length}
                  className={`p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    dateOffset + 7 >= allDays.length ? "opacity-30 cursor-not-allowed" : "cursor-pointer text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Section: What time works? */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                What time works?
              </h3>

              {availableSlots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/60 border-[#00a8ff] text-[#00a8ff] ring-1 ring-[#00a8ff]"
                            : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200">
                  EyeMantra {selectedLocation.shortName} is not operating on {selectedDay.dayName}, {selectedDay.monthName} {selectedDay.dayNumber}. Please choose another clinic location or a different date.
                </div>
              )}
            </div>

            {/* Section: Session type (Side by Side 2 Options - Exactly as requested) */}
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Session type:
              </div>

              {/* Side by side 2 buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* Button 1: Video */}
                <button
                  type="button"
                  onClick={() => setSessionType("video")}
                  className={`py-3 px-4 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                    sessionType === "video"
                      ? "bg-[#00a8ff] hover:bg-blue-500 text-white shadow-sm ring-2 ring-blue-400/20"
                      : "bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  <span>Video</span>
                </button>

                {/* Button 2: In person */}
                <button
                  type="button"
                  onClick={() => setSessionType("in-person")}
                  className={`py-3 px-4 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                    sessionType === "in-person"
                      ? "bg-[#00a8ff] hover:bg-blue-500 text-white shadow-sm ring-2 ring-blue-400/20"
                      : "bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>In person</span>
                </button>
              </div>

              {/* Video Note */}
              {sessionType === "video" && (
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 animate-in fade-in duration-150">
                  <Mail className="w-3.5 h-3.5 text-[#00a8ff] shrink-0" />
                  <span>
                    A secure telehealth video link will be generated and emailed to both you and {selectedDoctor.name}.
                  </span>
                </div>
              )}
            </div>

            {/* Conditional Location Selection when "In person" is chosen */}
            {sessionType === "in-person" && (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Clinic Location:
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Availability varies by location
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {LOCATIONS.map((loc) => {
                    const isSelected = selectedLocationCode === loc.code;
                    const isOpenToday = loc.operatingDays.includes(selectedDay.dayOfWeek);

                    return (
                      <button
                        key={loc.code}
                        type="button"
                        onClick={() => setSelectedLocationCode(loc.code)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/60 border-[#00a8ff] text-[#00a8ff] font-bold ring-1 ring-[#00a8ff]"
                            : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-xs font-semibold truncate w-full">
                          {loc.shortName}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            isOpenToday
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {isOpenToday ? "Available" : "Closed"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  📍 {selectedLocation.fullName} — {selectedLocation.address}
                </div>
              </div>
            )}

            {/* Bottom Action: Continue (Matching Reference) */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={availableSlots.length === 0}
                className={`w-full py-3 rounded-2xl text-white font-semibold text-sm transition-all cursor-pointer shadow-md active:scale-98 flex items-center justify-center gap-2 ${
                  availableSlots.length === 0
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none"
                    : "bg-[#00a8ff] hover:bg-blue-600 shadow-blue-500/20"
                }`}
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
