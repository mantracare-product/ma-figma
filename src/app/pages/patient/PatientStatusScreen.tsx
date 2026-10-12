import React, { useState, useRef, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router";
import {
  FileText,
  CreditCard,
  MapPin,
  Stethoscope,
  Calendar,
  ArrowRight,
  CheckCircle2,
  QrCode,
  Pill,
  Receipt,
  RotateCcw,
  ExternalLink,
  X,
  Phone,
  Clock,
  Download,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Client } from "../../../lib/clientsStore";
import { Process, Stage } from "../../../lib/useProcessStore";

interface PortalContext {
  activeClient: Client;
  activeProcess: Process;
  currentStageName: string;
  currentStageIndex: number;
  stages: Stage[];
  onStageChange: (newStageName: string) => void;
}

export default function PatientStatusScreen() {
  const navigate = useNavigate();
  const {
    activeClient,
    currentStageName,
    stages,
    onStageChange,
  } = useOutletContext<PortalContext>();

  const [activeModal, setActiveModal] = useState<"docs" | "directions" | "services" | null>(null);

  // Compute Previous, Current, Next triad depending on the active stage
  const getCareJourneyTriad = () => {
    switch (currentStageName) {
      case "Client Checked In":
        return {
          previous: {
            stepNumber: "Step 1",
            title: "Check-In Confirmed",
            statusLine: "Arrival verified at reception kiosk",
            icon: CheckCircle2,
            linkText: "View Check-In Pass",
            linkRoute: "/patient/checkin",
          },
          current: {
            stepNumber: "Step 2 of 5",
            title: "Book Doctor Appointment",
            description: "Select your physician, clinical specialty, and consultation slot to proceed with your visit.",
            icon: Calendar,
            actionLabel: "Book Appointment Now",
            actionRoute: "/patient/book",
            advanceStage: "Book Appointment",
          },
          next: {
            stepNumber: "Step 3 of 5",
            title: "Clinical Pharmacy",
            previewLine: "Prescription fulfillment and medication pickup at dispensary counter.",
            icon: Pill,
          },
        };
      case "Book Appointment":
        return {
          previous: {
            stepNumber: "Step 2",
            title: "Appointment Booked",
            statusLine: "Consultation scheduled with physician",
            icon: CheckCircle2,
            linkText: "View Appointment Slip",
            linkRoute: "/patient/book",
          },
          current: {
            stepNumber: "Step 3 of 5",
            title: "Clinical Pharmacy",
            description: "Your doctor's prescription has been transmitted to the dispensary counter. Pick up medications.",
            icon: Pill,
            actionLabel: "Go to Pharmacy",
            actionRoute: "/patient/pharmacy",
            advanceStage: "Move to Pharmacy",
          },
          next: {
            stepNumber: "Step 4 of 5",
            title: "Review Bill & Insurance",
            previewLine: "Itemized clinical invoice and insurance co-pay calculation.",
            icon: Receipt,
          },
        };
      case "Move to Pharmacy":
        return {
          previous: {
            stepNumber: "Step 3",
            title: "Prescriptions Prepared",
            statusLine: "Medications packaged and verified",
            icon: CheckCircle2,
            linkText: "View Pharmacy Slip",
            linkRoute: "/patient/pharmacy",
          },
          current: {
            stepNumber: "Step 4 of 5",
            title: "Review Bill & Insurance",
            description: "Review your itemized clinical charges, doctor consultation fee, and insurance breakdown.",
            icon: Receipt,
            actionLabel: "Review & Pay Bill",
            actionRoute: "/patient/bill",
            advanceStage: "Pay Bill",
          },
          next: {
            stepNumber: "Step 5 of 5",
            title: "Complete Payment",
            previewLine: "Instant settlement via payment QR or card terminal.",
            icon: CheckCircle2,
          },
        };
      case "Pay Bill":
        return {
          previous: {
            stepNumber: "Step 4",
            title: "Bill Reviewed",
            statusLine: "Invoice and insurance verified",
            icon: CheckCircle2,
            linkText: "View Invoice Details",
            linkRoute: "/patient/bill",
          },
          current: {
            stepNumber: "Step 5 of 5",
            title: "Complete Payment",
            description: "Scan your personalized invoice payment QR code or select digital payment to complete transaction.",
            icon: CheckCircle2,
            actionLabel: "Proceed to Payment QR",
            actionRoute: "/patient/pay",
            advanceStage: "Payment Done",
          },
          next: {
            stepNumber: "Final",
            title: "Visit Receipt & Discharge",
            previewLine: "Clinical discharge paperwork and payment verification summary.",
            icon: CheckCircle2,
          },
        };
      case "Payment Done":
      default:
        return {
          previous: {
            stepNumber: "Step 4",
            title: "Payment Settled",
            statusLine: "Invoice balance paid and confirmed",
            icon: CheckCircle2,
            linkText: "View Payment Record",
            linkRoute: "/patient/pay",
          },
          current: {
            stepNumber: "Care Complete",
            title: "Visit Completed & Settle Finalized",
            description: "All clinical protocol stages have been successfully completed. Your receipt and visit summary are ready.",
            icon: CheckCircle2,
            actionLabel: "View Payment Receipt",
            actionRoute: "/patient/pay",
            advanceStage: null,
          },
          next: {
            stepNumber: "Complete",
            title: "Care Protocol Concluded",
            previewLine: "All records synchronized to clinic electronic medical record.",
            icon: CheckCircle2,
          },
        };
    }
  };

  const triad = getCareJourneyTriad();
  const CurrentIcon = triad.current.icon;
  const NextIcon = triad.next.icon;

  const currentCardRef = useRef<HTMLDivElement>(null);
  const previousCardRef = useRef<HTMLDivElement>(null);
  const nextCardRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // In mobile view, ensure the Current Step card is opened and centered in the slide by default
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentCardRef.current && typeof window !== "undefined" && window.innerWidth < 768) {
        currentCardRef.current.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [currentStageName]);

  // Plain-language one-line status string for the welcome banner
  const getPlainLanguageStatus = (): string => {
    switch (currentStageName) {
      case "Client Checked In":
        return "You're checked in — next: Book Appointment";
      case "Book Appointment":
        return "Appointment scheduled — next: Move to Pharmacy";
      case "Move to Pharmacy":
        return "Prescriptions ready — next: Review & Pay Bill";
      case "Pay Bill":
        return "Bill generated — next: Complete Payment";
      case "Payment Done":
        return "All set — your visit and payment are complete";
      default:
        return `Current status: ${currentStageName}`;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Welcome Banner */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Welcome, {activeClient.name}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-500 font-medium">
          {getPlainLanguageStatus()}
        </p>
      </section>

      {/* 2. Three Distinct Steps Section: Previous | Current | Next */}
      <section className="space-y-2.5">
        {/* Mobile Slide Quick Nav Indicators */}
        <div className="flex md:hidden items-center justify-between px-1 text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Care Steps
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => previousCardRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              1. Previous
            </button>
            <button
              type="button"
              onClick={() => currentCardRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-blue-600 shadow-2xs transition-colors cursor-pointer"
            >
              2. Current (Active)
            </button>
            <button
              type="button"
              onClick={() => nextCardRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              3. Next
            </button>
          </div>
        </div>

        {/* Desktop: 3-column equal grid. Mobile: Horizontal snap-slider in same row */}
        <div
          ref={sliderRef}
          className="flex md:grid md:grid-cols-3 gap-4 items-stretch overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-3 md:pb-0 scroll-smooth px-1 md:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Previous Step */}
          <div
            ref={previousCardRef}
            className="w-[85vw] sm:w-[350px] md:w-auto shrink-0 md:shrink snap-center bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Previous
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  Completed
                </span>
              </div>

              <div className="flex items-start gap-3 mt-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-slate-900 leading-snug">
                    {triad.previous.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {triad.previous.statusLine}
                  </p>
                </div>
              </div>
            </div>

            {/* "View Check-In Pass" sits cleanly under Previous */}
            {triad.previous.linkText && triad.previous.linkRoute && (
              <div className="pt-3 mt-4 border-t border-slate-200/60">
                <button
                  type="button"
                  onClick={() => navigate(triad.previous.linkRoute)}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors group cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span>{triad.previous.linkText}</span>
                </button>
              </div>
            )}
          </div>

          {/* Current Step (Opened/Centered by default) */}
          <div
            ref={currentCardRef}
            className="w-[85vw] sm:w-[350px] md:w-auto shrink-0 md:shrink snap-center bg-white border-2 border-blue-500/40 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden flex flex-col justify-between h-full"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Current Step • {triad.current.stepNumber}
                </span>
              </div>

              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <CurrentIcon className="w-4 h-4" />
                  </span>
                  <span>{triad.current.title}</span>
                </h2>
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {triad.current.description}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigate(triad.current.actionRoute)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-600/20 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
              >
                <span>{triad.current.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {triad.current.advanceStage ? (
                <button
                  type="button"
                  onClick={() => onStageChange(triad.current.advanceStage!)}
                  className="text-[11px] text-slate-400 hover:text-slate-700 font-medium transition-colors text-center cursor-pointer"
                  title="Demo fast-forward"
                >
                  Skip to {triad.current.advanceStage} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onStageChange("Client Checked In")}
                  className="inline-flex items-center justify-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 font-medium transition-colors cursor-pointer"
                  title="Reset demo journey"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Step 1
                </button>
              )}
            </div>
          </div>

          {/* Next Step */}
          <div
            ref={nextCardRef}
            className="w-[85vw] sm:w-[350px] md:w-auto shrink-0 md:shrink snap-center bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Next
                </span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full">
                  {triad.next.stepNumber}
                </span>
              </div>

              <div className="flex items-start gap-3 mt-2">
                <div className="w-8 h-8 rounded-lg bg-slate-200/70 text-slate-500 flex items-center justify-center shrink-0 mt-0.5">
                  <NextIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-slate-800 leading-snug">
                    {triad.next.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {triad.next.previewLine}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-4 border-t border-slate-200/60 text-[11px] text-slate-400 italic">
              Unlocks after Current step
            </div>
          </div>
        </div>
      </section>

      {/* 3. Quick Action Square Buttons */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. Docs */}
          <button
            type="button"
            onClick={() => setActiveModal("docs")}
            className="bg-white border border-slate-200/80 hover:border-blue-400/80 hover:shadow-md rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center aspect-square transition-all group active:scale-[0.98]"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center mb-2.5 transition-colors">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Docs
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              Records & PDFs
            </span>
          </button>

          {/* 2. Payments */}
          <button
            type="button"
            onClick={() => navigate("/patient/bill")}
            className="bg-white border border-slate-200/80 hover:border-blue-400/80 hover:shadow-md rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center aspect-square transition-all group active:scale-[0.98]"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center mb-2.5 transition-colors">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Payments
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              Bills & receipts
            </span>
          </button>

          {/* 3. Directions */}
          <button
            type="button"
            onClick={() => setActiveModal("directions")}
            className="bg-white border border-slate-200/80 hover:border-blue-400/80 hover:shadow-md rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center aspect-square transition-all group active:scale-[0.98]"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center mb-2.5 transition-colors">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Directions
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              Clinic & parking
            </span>
          </button>

          {/* 4. Services */}
          <button
            type="button"
            onClick={() => setActiveModal("services")}
            className="bg-white border border-slate-200/80 hover:border-blue-400/80 hover:shadow-md rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center aspect-square transition-all group active:scale-[0.98]"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center mb-2.5 transition-colors">
              <Stethoscope className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Services
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              Specialties
            </span>
          </button>

          {/* 5. Appointments */}
          <button
            type="button"
            onClick={() => navigate("/patient/book")}
            className="bg-white border border-slate-200/80 hover:border-blue-400/80 hover:shadow-md rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center aspect-square transition-all group active:scale-[0.98]"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center mb-2.5 transition-colors">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Appointments
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              Schedule visit
            </span>
          </button>
        </div>
      </section>

      {/* Docs Modal */}
      {activeModal === "docs" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Patient Documents</h3>
                  <p className="text-[11px] text-slate-400">Available medical files for {activeClient.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { title: "Clinical Care Plan Summary", date: "Today", size: "142 KB" },
                { title: "Patient Intake & Consent Form", date: "Verified", size: "98 KB" },
                { title: "Prescription & Pharmacy Slip", date: "Ready", size: "84 KB" },
                { title: "Itemized Consultation Invoice", date: "Generated", size: "115 KB" },
              ].map((doc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-200 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">{doc.title}</div>
                      <div className="text-[10px] text-slate-400">{doc.date} • {doc.size}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert(`Downloading ${doc.title}...`)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                    title="Download document"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Directions Modal */}
      {activeModal === "directions" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Clinic Directions & Location</h3>
                  <p className="text-[11px] text-slate-400">MantraCare Medical Center</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="font-semibold text-slate-900 mb-1">Clinic Address</div>
                <p>742 Evergreen Health Plaza, Suite 400</p>
                <p className="text-slate-400 text-[11px] mt-0.5">San Francisco, CA 94107</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Hours
                  </div>
                  <p className="text-[11px]">Mon–Sat: 8:00 AM – 8:00 PM</p>
                  <p className="text-[11px] text-slate-400">Emergency 24/7</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> Contact
                  </div>
                  <p className="text-[11px]">+1 (555) 019-2834</p>
                  <p className="text-[11px] text-slate-400">help@mantracare.app</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 text-[11px]">
                <strong className="block mb-0.5 font-semibold">Parking Information</strong>
                Complimentary patient parking available at Level P1 & P2 with ticket validation at Reception.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-semibold hover:underline"
              >
                Open in Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services Modal */}
      {activeModal === "services" && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Clinical Services & Departments</h3>
                  <p className="text-[11px] text-slate-400">Available care specialties at MantraCare</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { name: "General Medicine & Checkup", desc: "Routine health screening, vitals check, consultations" },
                { name: "Specialized Cardiology", desc: "Cardiac evaluations, ECG, lipid health management" },
                { name: "In-House Clinical Pharmacy", desc: "Prescription fulfillment, dosage guidance, pickup" },
                { name: "Diagnostic Laboratory", desc: "Comprehensive blood tests, imaging referrals" },
              ].map((svc, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{svc.name}</div>
                    <div className="text-[11px] text-slate-500">{svc.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      navigate("/patient/book");
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] transition-colors"
                  >
                    Book
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
